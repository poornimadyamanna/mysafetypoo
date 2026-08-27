import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';
import { User } from '../models/User';

export class TOTPService {
    static generateSecret(email: string) {
        const secret = speakeasy.generateSecret({
            name: `MySafety (${email})`,
            length: 32
        });
        return {
            secret: secret.base32,
            qrCode: secret.otpauth_url
        };
    }

    static verifyToken(secret: string, token: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 0 // 1 : Current + 1 previous + 1 next (±30 seconds = 90 seconds total), 2 : Current + 2 previous + 2 next (±60 seconds = 150 seconds total)
        });
    }

    static generateBackupCodes(count: number = 10): string[] {
        const codes: string[] = [];
        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code);
        }
        return codes;
    }

    static hashBackupCode(code: string): string {
        return crypto.createHash('sha256').update(code).digest('hex');
    }

    static async verifyBackupCode(userId: string, code: string): Promise<boolean> {
        const user = await User.findById(userId);
        if (!user || !user.twoFactorBackupCodes) return false;

        const hashedCode = this.hashBackupCode(code);
        const index = user.twoFactorBackupCodes.indexOf(hashedCode);

        if (index === -1) return false;

        user.twoFactorBackupCodes.splice(index, 1);
        await user.save();
        return true;
    }
}
