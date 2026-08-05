import { z } from "zod";

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "letters, numbers, underscores only"),
  email: z.email().toLowerCase().trim(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string(),
  password: z.string().min(8).max(100),
  username: z.string().min(3).max(30).optional(),
});