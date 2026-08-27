import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { errorResponse } from "../utils/response";
import { SessionToken } from "../models/SessionToken";
import { AuthenticatedRequest } from "./auth.middleware";
import logger from "../config/logger";


const ACCESS_TOKEN_EXPIRY = "1d";

export const authenticateAdmin = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const cookie = req.cookies?.accessToken;

    const token = (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : null) || cookie;

    if (!token) {
      return await errorResponse(req, res, "unauthorized_missing_token", 401);
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    } catch (err: any) {
      logger.error(err);
      
      if (err.name === "JsonWebTokenError" && err.message === "invalid signature") {
        return await errorResponse(req, res, "token_invalid_signature", 401);
      }
      
      if (err.name === "TokenExpiredError") {
        const session = await SessionToken.findOne({ accessToken: token });

        if (!session || !session.userId) {
          return await errorResponse(req, res, "unauthorized_user_not_found", 401);
        }

        const user = session.userId as any;

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
          session.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
          await session.save();

          if (user.role !== "admin") {
            return await errorResponse(req, res, "access_denied_invalid_role", 403);
          }

          res.setHeader("x-access-token", newAccessToken);
          req.admin = user;
          return next();
        } catch (refreshError) {
          return await errorResponse(req, res, "session_expired", 401);
        }
      }

      return await errorResponse(req, res, "unauthorized_invalid_token", 401);
    }

    const session = await SessionToken.findOne({ accessToken: token }).populate("userId");

    if (!session || !session.userId) {
      return await errorResponse(req, res, "unauthorized_user_not_found", 401);
    }

    const user = session.userId as any;

    if (user.role !== "admin") {
      return await errorResponse(req, res, "access_denied_invalid_role", 403);
    }

    req.admin = user;
    next();
  } catch (err: any) {
    return await errorResponse(req, res, "unauthorized", 401);
  }
};