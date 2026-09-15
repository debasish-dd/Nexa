import { Router } from "express";
import messageRouter from "./message.routes";
import participantRouter from "./participant.routes";

const router = Router();

router.use("/:conversationId/messages", messageRouter);
router.use("/:conversationId/participants", participantRouter);
 
export default router;