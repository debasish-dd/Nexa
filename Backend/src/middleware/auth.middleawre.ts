import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/async-handler";
import { ApiError } from "../utils/api-error";
import { getPool } from "../db/pool";

export interface AccessTokenPayload {
  userId: string;
  role: string;
  sessionId: string;
  iat: number;
  exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: AccessTokenPayload;
        }
    }
}

export const isUserLoggedIn = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const cookieToken = req.cookies?.accessToken;
    const headerToken = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice(7)
      : undefined;

    const token = cookieToken ?? headerToken;

    if (!token) {
      throw new ApiError(401, "Not authenticated");
    }

    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, "Access token expired");
      }
      throw new ApiError(401, "Invalid access token");
    }

    req.user = payload;
    next();
  }
);

export const requireVerified = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const pool = getPool();
    const result = await pool.query(
      `SELECT email_verified_at FROM users WHERE id = $1`,
      [req.user!.userId]
    );
    if (!result.rows[0]?.email_verified_at) {
      throw new ApiError(403, "Please verify your email to perform this action");
    }
    next();
  }
);