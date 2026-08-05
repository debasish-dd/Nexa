import { Router } from "express";
import { userLogin, userRegister } from "../controllers/auth.controllers";
import { validate } from "../middleware/validation.middleware";
import { loginSchema, registerSchema } from "../validations/auth.validations";

const router = Router();
router.post("/register",validate(registerSchema),  userRegister);
router.post("/login",validate(loginSchema),  userLogin);

export default router;