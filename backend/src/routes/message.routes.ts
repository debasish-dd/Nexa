import { Router } from "express";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import { getMessages } from "../controllers/messaging/message.controller";

const router = Router({ mergeParams: true }); 
router.use(isUserLoggedIn);

router.get("/", getMessages);

export default router;