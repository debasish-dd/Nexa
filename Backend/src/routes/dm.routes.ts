import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import { createDM, getDM, deleteDM } from "../controllers/messaging/dm.controller";

const router = Router();
router.use(isUserLoggedIn);

router.post("/", createDM);
router.get("/:userId", getDM);
router.delete("/:conversationId", deleteDM);

export default router;