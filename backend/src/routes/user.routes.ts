import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { isUserLoggedIn } from "../middleware/auth.middleware";
import {
    getUserByIdController,
    searchUsersController,
} from "../controllers/user.controllers";

const router = Router();

const searchLimiter = rateLimit({ windowMs: 60 * 1000, limit: 30 }); // 30 searches per minute
const lookupLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120 }); // 120 profile lookups per minute

// /search must stay ABOVE /:id, otherwise Express treats "search" as an id.
router.get("/search", isUserLoggedIn, searchLimiter, searchUsersController);
router.get("/:id", isUserLoggedIn, lookupLimiter, getUserByIdController);

export default router;