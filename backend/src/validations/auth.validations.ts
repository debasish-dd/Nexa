import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscores only"),
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(255),
  password: z.string().min(8).max(100),
});