import type { Request, Response } from "express";
import argon2 from "argon2";
import { getPool } from "../db/pool";
import asyncHandler from "../utils/async-handler";
import { ApiResponse } from "../utils/api-response";
import { ApiError } from "../utils/api-error";
import { randomBytes, randomUUID, createHash } from "crypto"
import { generateAccessAndRefreshToken } from "../services/auth.service";
import { UAParser } from "ua-parser-js";
import type { CookieOptions } from "express";
import { sendVerificationEmail } from "../services/email.service";

const generateVerificationToken = () => {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, hashedToken };
};


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

  const { rawToken, hashedToken } = generateVerificationToken();
  const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const result = await pool.query(
    `INSERT INTO users (username, email, password_hash, verification_token, verification_token_expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, username, email, role, student_status, created_at`,
    [username, email, passwordHash, hashedToken, tokenExpiresAt]
  );
  const user = result.rows[0];

  try {
    await sendVerificationEmail(user.email, rawToken, user.username);
  } catch (err) {

    console.error("Failed to send verification email:", err);
  }

  return res.status(201).json(
    new ApiResponse(201, "Registered. Check your email to verify your account.", user)
  );
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.query as { token?: string };
  if (!token) throw new ApiError(400, "Missing verification token");

  const hashedToken = createHash("sha256").update(token).digest("hex");
  const pool = getPool();

  const userResult = await pool.query(
    `SELECT id, username, email, role, student_status, verification_token_expires_at, email_verified_at
     FROM users WHERE verification_token = $1`,
    [hashedToken]
  );
  const user = userResult.rows[0];

  if (!user) throw new ApiError(400, "Invalid or expired verification link");
  if (user.email_verified_at) throw new ApiError(400, "Email already verified");
  if (new Date(user.verification_token_expires_at) < new Date())
    throw new ApiError(400, "Verification link expired. Request a new one.");

  const updateResult = await pool.query(
    `UPDATE users
     SET email_verified_at = now(),
         verification_token = NULL,
         verification_token_expires_at = NULL,
         student_status = CASE WHEN student_status = 'UNVERIFIED' THEN 'VERIFIED' ELSE student_status END
     WHERE id = $1
     RETURNING id, username, email, role, student_status`,
    [user.id]
  );
  const verifiedUser = updateResult.rows[0];

  // now that identity is confirmed, create the session
  const sessionId = randomUUID();
  const {
    accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, hashedRefreshToken,
  } = await generateAccessAndRefreshToken(verifiedUser.id, verifiedUser.role, sessionId);

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
    sameSite: "none",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  const userAgent = req.headers["user-agent"];
  const ipAddress = req.ip;
  const parser = new UAParser(req.headers["user-agent"]);
  const parsed = parser.getResult();
  const deviceType = parsed.device.type ?? "desktop";
  const deviceName = [parsed.browser.name, parsed.os.name, parsed.device.model]
    .filter(Boolean)
    .join(" ");

  await pool.query(
    `INSERT INTO refresh_sessions (id, refresh_token_hash, user_id, user_agent, device_type, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, hashedRefreshToken, verifiedUser.id, userAgent, deviceType, deviceName, ipAddress, refreshExpiresAt]
  );

  return res.status(200).json(new ApiResponse(200, "Email verified", verifiedUser));
});

export const resendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, "Email is required");


  const pool = getPool();
  const result = await pool.query(`
      SELECT id, username, email, email_verified_at FROM users WHERE email = $1
    `, [email]);
  if (result.rows.length === 0) {
    throw new ApiError(404, "User not found");
  }
  const user = result.rows[0];
  if (user.email_verified_at) {
    throw new ApiError(400, "Email already verified");
  }
  const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const { rawToken, hashedToken } = generateVerificationToken();

  await pool.query(
    `UPDATE users
      SET verification_token = $1, verification_token_expires_at = $2
      WHERE id = $3`,
    [hashedToken, tokenExpiresAt, user.id]
  );
  try {
    await sendVerificationEmail(user.email, rawToken, user.username);
  } catch (err) {
    console.error("Failed to resend verification email:", err);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      "If an account exists with that email, a verification link has been sent."
    )
  );

});

export const userLogin = asyncHandler(async (req: Request, res: Response) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    throw new ApiError(400, "Username/email and password are required");
  }

  const pool = getPool();
  const result = await pool.query(
    `SELECT id, username, email, password_hash, role, student_status, email_verified_at
     FROM users
     WHERE username = $1 OR email = $1`,
    [identifier]
  );
  const user = result.rows[0];

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const isPasswordValid = await argon2.verify(user.password_hash, password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }
  const sessionId = randomUUID();
  const {
    accessToken, accessExpiresAt, refreshToken, refreshExpiresAt, hashedRefreshToken,
  } = await generateAccessAndRefreshToken(user.id, user.role, sessionId);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: accessExpiresAt.getTime() - Date.now(),
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  const userAgent = req.headers["user-agent"];
  const ipAddress = req.ip;
  const parser = new UAParser(req.headers["user-agent"]);
  const parsed = parser.getResult();
  const deviceType = parsed.device.type ?? "desktop";
  const deviceName = [parsed.browser.name, parsed.os.name, parsed.device.model]
    .filter(Boolean)
    .join(" ");

  await pool.query(
    `INSERT INTO refresh_sessions (id, refresh_token_hash, user_id, user_agent, device_type, device_name, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [sessionId, hashedRefreshToken, user.id, userAgent, deviceType, deviceName, ipAddress, refreshExpiresAt]
  );
  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      student_status: user.student_status,
      email_verified_at: user.email_verified_at,
    })
  );


});

export const userLogout = asyncHandler(async (req: Request, res: Response) => {

});
