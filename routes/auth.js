import express from "express";
import { login } from "../controller/authController.js";
import { loginValidation } from "../middleware/validators/authValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import authenticateToken from "../middleware/auth/authenticateToken.js";

const router = express.Router();

router.post("/login", loginValidation, handleValidationErrors, login);

export default router;
