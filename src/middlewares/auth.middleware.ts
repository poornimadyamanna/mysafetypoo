import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { errorResponse } from "../utils/response";
import { SessionToken } from "../models/SessionToken"; // adjust path if needed

// const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "access_token_secret";
// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "refresh_token_secret";
const ACCESS_TOKEN_EXPIRY = "1d";

export interface AuthenticatedRequest extends Request {
  user?: any;
  admin?: any;
  visitor?: any;
}


export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return await errorResponse(req, res, "unauthorized_missing_token", 401);
    }

    const token = authHeader.split(" ")[1];

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    } catch (err: any) {
      // Handle expired token case
      if (err.name === "TokenExpiredError") {
        // const session = await SessionToken.findOne({ accessToken: token }).populate("userId");
        const session = await SessionToken.findOne({ accessToken: token });

        if (!session || !session.userId) {
          return await errorResponse(req, res, "unauthorized_user_not_found", 401);
        }

        const user = session.userId as any; // cast to access user fields

        if (!session.refreshToken) {
          return await errorResponse(req, res, "session_expired", 401);
        }

        try {
          jwt.verify(session.refreshToken, process.env.REFRESH_TOKEN_SECRET!);

          const newAccessToken = jwt.sign(
            { id: user._id, phone: user.phone },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
          );

          session.accessToken = newAccessToken;
          session.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // optional
          await session.save();

          if (user.role !== "user") {
            return await errorResponse(req, res, "access_denied_invalid_role", 403);
          }

          res.setHeader("x-access-token", newAccessToken);
          req.user = user;
          return next();
        } catch (refreshError) {
          return await errorResponse(req, res, "session_expired", 401);
        }
      }

      return await errorResponse(req, res, "unauthorized_invalid_token", 401);
    }

    // Token is valid — find session and user
    const session = await SessionToken.findOne({ accessToken: token }).populate("userId");

    if (!session || !session.userId) {
      return await errorResponse(req, res, "unauthorized_user_not_found", 401);
    }

    const user = session.userId as any;

    if (user.role !== "user") {
      return await errorResponse(req, res, "access_denied_invalid_role", 403);
    }

    req.user = user;
    next();
  } catch (err: any) {
    return await errorResponse(req, res, "unauthorized", 401);
  }
};
