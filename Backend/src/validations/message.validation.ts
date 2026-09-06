import { z } from "zod";

export const messageSendSchema = z.object({
  conversationId: z.uuid(),
  content: z.string().trim().min(1, "Message cannot be empty").max(2000, "Message too long"),
});
