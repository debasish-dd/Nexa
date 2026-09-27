import { Router } from "express";
import { forgotPassword, getCurrentUser, refreshAccessToken, resetPassword, userLogin, userLogout, userRegister, verifyEmail } from "../controllers/auth.controllers";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../validations/auth.validations";
import { isUserLoggedIn } from "../middleware/auth.middleware";

const router = Router();
router.post("/register", validate(registerSchema), userRegister);
router.post("/login", validate(loginSchema), userLogin);
router.post('/verify-email', verifyEmail);
router.post('/logout', userLogout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/refresh-access-token', refreshAccessToken);
router.get( "/me", isUserLoggedIn, getCurrentUser);


export default router;