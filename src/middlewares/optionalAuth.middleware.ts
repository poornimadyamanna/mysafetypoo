import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { SessionToken } from "../models/SessionToken";
import { AuthenticatedRequest } from "./auth.middleware";

const ACCESS_TOKEN_EXPIRY = "1d";

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;

    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!);
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        const session = await SessionToken.findOne({ accessToken: token });

        if (!session || !session.userId) {
          req.user = null;
          return next();
        }

        const user = session.userId as any;

        if (!session.refreshToken) {
          req.user = null;
          return next();
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

          res.setHeader("x-access-token", newAccessToken);
          req.user = user;
          return next();
        } catch (refreshError) {
          req.user = null;
          return next();
        }
      }

      req.user = null;
      return next();
    }

    const session = await SessionToken.findOne({ accessToken: token }).populate("userId");

    if (session && session.userId) {
      req.user = session.userId;
    } else {
      req.user = null;
    }

    next();
  } catch (err) {
    req.user = null;
    next();
  }
};
