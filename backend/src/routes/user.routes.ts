import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { isUserLoggedIn } from "../middleware/auth.middleware"; 
import { searchUsersController } from "../controllers/user.controllers";

const router = Router();

const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 }); // 30 searches per minute

router.get("/search", isUserLoggedIn, searchLimiter, searchUsersController);

export default router;