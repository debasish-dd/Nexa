import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import {
    addMember,
    changeMemberRole,
    createGroup,
    deleteGroup,
    getDiscoverableGroups,
    getGCByConversationId,
    getGroupInbox,
    joinGroup,
    removeMember,
    transferAdmin,
    updateGroup,
} from "../controllers/messaging/group.controller";

const router = Router();
router.use(isUserLoggedIn);

router.post("/", createGroup);

// Group inbox
router.get("/conversations", getGroupInbox);

// Discover communities (static route)
router.get("/discoverable", getDiscoverableGroups);
router.post("/:conversationId/join", joinGroup);

// Individual group details
router.get("/:conversationId", getGCByConversationId);

router.patch("/:conversationId", updateGroup);
router.delete("/:conversationId", deleteGroup);

router.post("/:conversationId/members", addMember);
router.delete("/:conversationId/members/:userId", removeMember);
router.patch("/:conversationId/members/:userId/role", changeMemberRole);
router.post("/:conversationId/transfer-admin", transferAdmin);

export default router;