import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import { deleteMessage, editMessage, getMessages, sendMessage } from "../controllers/messaging/message.controller";

const router = Router({ mergeParams: true }); 
router.use(isUserLoggedIn);

router.get("/", getMessages);
router.post("/", sendMessage);
router.patch("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);

export default router;