import type { Request, Response } from "express";
import argon2 from "argon2";
import { getPool } from "../db/pool";
import asyncHandler from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { randomUUID } from "crypto";
import { generateAccessAndRefreshToken } from "../services/auth.service";
import { UAParser } from "ua-parser-js";
import type { CookieOptions } from "express";


export const userRegister = asyncHandler(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  const passwordHash = await argon2.hash(password);

  const pool = getPool();
  const existing = await pool.query(
    `SELECT id FROM users WHERE username = $1 OR email = $2`,
    [username, email]
  );
  if (existing.rows.length > 0) {
    throw new ApiError(400, "Username or email already exists");
  }

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, role, created_at`,
    [username, email, passwordHash]
  );
  const user = result.rows[0];

  const sessionId = randomUUID();
  const {
    accessToken,
    accessExpiresAt,
    refreshToken,
    refreshExpiresAt,
    hashedRefreshToken, } = await generateAccessAndRefreshToken(user.id, user.role, sessionId);

  const cookieOptions: CookieOptions = {
    httpOnly: true,
    maxAge: accessExpiresAt.getTime() - Date.now(),
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };
  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  const userAgent = req.headers['user-agent']
  const ipAddress = req.ip;
  const parser = new UAParser(req.headers["user-agent"]);
  const endData = parser.getResult();
  const deviceType = endData.device.type ?? "desktop";
  const deviceName = [
    endData.browser.name,
    endData.os.name,
    endData.device.model
  ]
    .filter(Boolean)
    .join(" ");


  await pool.query(
    `
    INSERT INTO refresh_sessions (id, refresh_token_hash, user_id, user_agent, device_type, device_name, ip_address, expires_at)
    VALUES ($1, $2,$3, $4, $5, $6, $7, $8 )
    `,
    [sessionId, hashedRefreshToken, user.id, userAgent, deviceType, deviceName, ipAddress, refreshExpiresAt]
  );
  return res.status(201).json(
    new ApiResponse(
      201,
      "User registered successfully",
      result.rows[0]
    )
  );
});

export const userLogin = asyncHandler(async (req: Request, res: Response) => {
  const { email, password, username } = req.body;

});