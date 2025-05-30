import express from "express";
import { login } from "../controller/authController.js";
import { loginValidation } from "../middleware/validators/authValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import authenticateToken from "../middleware/auth/authenticateToken.js";

const router = express.Router();

router.post("/login", loginValidation, handleValidationErrors, login);
router.post("/check", authenticateToken, (req, res) => {
	res.sendStatus(200);
});

export default router;
