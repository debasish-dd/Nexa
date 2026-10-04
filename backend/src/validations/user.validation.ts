import { z } from "zod";

export const searchUsersQuerySchema = z.object({
  q: z.string().trim().min(2).max(30),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().max(200).optional(),
});