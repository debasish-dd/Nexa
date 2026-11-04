import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import {
    addMember,
    changeMemberRole,
    createGroup,
    deleteGroup,
    getGroup,
    removeMember,
    transferAdmin,
    updateGroup,
} from "../controllers/messaging/group.controller";

const router = Router();
router.use(isUserLoggedIn);

router.post("/", createGroup);
router.get("/:conversationId", getGroup);
router.patch("/:conversationId", updateGroup);
router.delete("/:conversationId", deleteGroup);

router.post("/:conversationId/members", addMember);
router.delete("/:conversationId/members/:userId", removeMember);
router.patch("/:conversationId/members/:userId/role", changeMemberRole);
router.post("/:conversationId/transfer-admin", transferAdmin);

export default router;