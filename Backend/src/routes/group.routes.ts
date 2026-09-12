import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import { createGroup, getGroup, updateGroup, deleteGroup } from "../controllers/messaging/group.controller";

const router = Router();
router.use(isUserLoggedIn);

router.post("/", createGroup);
router.get("/:groupId", getGroup);
router.patch("/:groupId", updateGroup);
router.delete("/:groupId", deleteGroup);

export default router;