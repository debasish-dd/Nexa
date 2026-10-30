import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import { getInbox, markConversationRead } from "../controllers/messaging/conversation.controller";
import messageRouter from "./message.routes";

const router = Router();

router.get("/", isUserLoggedIn, getInbox);
router.use("/:conversationId/messages", messageRouter);
router.post("/:conversationId/read", isUserLoggedIn, markConversationRead);

// Participant router intentionally not mounted: it has no permission checks.
// Re-add it when group chats need it, with a mod/admin check in the service.

export default router;