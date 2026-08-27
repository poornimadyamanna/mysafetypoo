import { injectable } from "tsyringe";
import jwt from "jsonwebtoken";
import { DigiLockerToken } from "../models/DigiLockerToken";
import { Types } from "mongoose";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import logger from "../config/logger";

// In Node 18+ fetch is global; if not, install node-fetch
// import fetch from "node-fetch";

const {
    DIGILOCKER_CLIENT_ID,
    DIGILOCKER_CLIENT_SECRET,
    DIGILOCKER_AUTH_URL,
    DIGILOCKER_TOKEN_URL,
    DIGILOCKER_API_BASE,
    DIGILOCKER_REDIRECT_URI,
    DIGILOCKER_STATE_SECRET,
} = process.env;

// if (
//     !DIGILOCKER_CLIENT_ID ||
//     !DIGILOCKER_CLIENT_SECRET ||
//     !DIGILOCKER_AUTH_URL ||
//     !DIGILOCKER_TOKEN_URL ||
//     !DIGILOCKER_API_BASE ||
//     !DIGILOCKER_REDIRECT_URI ||
//     !DIGILOCKER_STATE_SECRET
// ) {
//     // Fail fast at startup
//     logger.warn("[DigiLocker] Missing environment variables – integration will not work.");
// }

function base64url(buffer: Buffer) {
    return buffer
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
}

@injectable()
export class DigiLockerService {
    /**
     * Create an authorize URL with a signed state that contains the userId.
     */
    getAuthorizeUrl(userId: string): string {
        // 1) Generate PKCE code_verifier
        const codeVerifier = base64url(crypto.randomBytes(32));

        // 2) Derive code_challenge = BASE64URL(SHA256(code_verifier))
        const codeChallenge = base64url(
            crypto.createHash("sha256").update(codeVerifier).digest()
        );

        // 3) Put BOTH userId and codeVerifier into signed state JWT
        const statePayload = {
            uid: userId,
            cv: codeVerifier, // code_verifier
            nonce: crypto.randomBytes(16).toString("hex"),
        };

        const state = jwt.sign(statePayload, DIGILOCKER_STATE_SECRET as string, {
            expiresIn: "10m",
        });

        const params = new URLSearchParams({
            response_type: "code",
            client_id: DIGILOCKER_CLIENT_ID as string,
            redirect_uri: DIGILOCKER_REDIRECT_URI as string,
            scope: "files.issueddocs",
            state,
            code_challenge: codeChallenge,
            code_challenge_method: "S256",
        });

        return `${DIGILOCKER_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Verify state token and return userId embedded in it.
     */
    verifyState(state: string): { userId: string; codeVerifier: string } {
        const decoded = jwt.verify(state, DIGILOCKER_STATE_SECRET as string) as any;
        return { userId: decoded.uid, codeVerifier: decoded.cv };
    }

    /**
     * Handle OAuth callback: exchange code → token and persist for user.
     */
    async handleCallback(code: string, userId: string, codeVerifier: string) {
        const body = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: DIGILOCKER_CLIENT_ID as string,
            client_secret: DIGILOCKER_CLIENT_SECRET as string,
            redirect_uri: DIGILOCKER_REDIRECT_URI as string,
            code_verifier: codeVerifier,         // <-- important for PKCE
        });

        const resp = await fetch(DIGILOCKER_TOKEN_URL as string, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!resp.ok) {
            const text = await resp.text();
            logger.error("[DigiLocker] Token exchange failed:", text);
            throw new Error("digilocker_token_exchange_failed");
        }

        const json: any = await resp.json();

        const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
        const consentValidTill =
            json.consent_valid_till && !isNaN(json.consent_valid_till)
                ? new Date(json.consent_valid_till * 1000)
                : undefined;

        await DigiLockerToken.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            {
                accessToken: json.access_token,
                refreshToken: json.refresh_token,
                accessTokenExpiresAt: expiresAt,
                consentValidTill,
            },
            { upsert: true, new: true }
        );
    }


    /**
     * Get a valid access token (refresh if needed).
     */
    private async getValidAccessToken(userId: string): Promise<string> {
        const record = await DigiLockerToken.findOne({ userId });

        if (!record) {
            throw new Error("digilocker_not_linked");
        }

        if (record.accessTokenExpiresAt.getTime() - Date.now() > 60_000) {
            return record.accessToken;
        }

        if (!record.refreshToken) {
            throw new Error("digilocker_refresh_token_missing");
        }

        const body = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: record.refreshToken,
            client_id: DIGILOCKER_CLIENT_ID as string,
            client_secret: DIGILOCKER_CLIENT_SECRET as string,
        });

        const resp = await fetch(DIGILOCKER_TOKEN_URL as string, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body,
        });

        if (!resp.ok) {
            const text = await resp.text();
            logger.error("[DigiLocker] Refresh token failed:", text);
            throw new Error("digilocker_refresh_failed");
        }

        const json: any = await resp.json();
        record.accessToken = json.access_token;
        record.accessTokenExpiresAt = new Date(Date.now() + json.expires_in * 1000);
        if (json.refresh_token) record.refreshToken = json.refresh_token;
        await record.save();

        return record.accessToken;
    }

    /**
     * List all issued documents for this user from DigiLocker.
     */
    async getIssuedDocuments(userId: string): Promise<any[]> {
        const accessToken = await this.getValidAccessToken(userId);

        const resp = await fetch(`${DIGILOCKER_API_BASE}/files/issued`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) {
            const text = await resp.text();
            logger.error("[DigiLocker] files/issued error:", text);
            throw new Error("digilocker_fetch_issued_failed");
        }

        const json: any = await resp.json();
        return json.items || [];
    }

    /**
     * Download a file by URI from DigiLocker, and save it locally.
     * For real prod you might upload this buffer to S3 instead.
     */
    async downloadAndSaveDocument(
        userId: string,
        uri: string
    ): Promise<{
        fileUrl: string;
        fileName: string;
        fileSize: number;
        mimeType: string;
    }> {
        const accessToken = await this.getValidAccessToken(userId);
        const encodedUri = encodeURIComponent(uri);

        const resp = await fetch(`${DIGILOCKER_API_BASE}/files/uri/${encodedUri}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!resp.ok) {
            const text = await resp.text();
            logger.error("[DigiLocker] files/uri error:", text);
            throw new Error("digilocker_download_failed");
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType =
            resp.headers.get("content-type") || "application/octet-stream";

        // VERY SIMPLE local storage example – replace with S3 if needed
        const uploadsDir = path.join(process.cwd(), "uploads", "digilocker");
        await fs.promises.mkdir(uploadsDir, { recursive: true });

        const safeName = uri.replace(/[^a-zA-Z0-9_-]/g, "_");
        const extension = mimeType === "application/pdf" ? ".pdf" : "";
        const fileName = `${safeName}${extension}`;
        const filePath = path.join(uploadsDir, fileName);

        await fs.promises.writeFile(filePath, buffer);

        // If you serve /uploads as static, this becomes your URL
        const fileUrl = `/uploads/digilocker/${fileName}`;

        return {
            fileUrl,
            fileName,
            fileSize: buffer.length,
            mimeType,
        };
    }
}
