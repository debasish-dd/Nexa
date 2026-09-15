import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import {
    addParticipant,
    getConversationParticipants,
    checkParticipant,
    changeParticipantRole,
    removeParticipant,
} from "../controllers/messaging/participant.controller";

const router = Router({ mergeParams: true });
router.use(isUserLoggedIn);

router.post("/", addParticipant);
router.get("/", getConversationParticipants);
router.get("/check", checkParticipant);
router.patch("/:userId/role", changeParticipantRole);
router.delete("/:userId", removeParticipant);

export default router;