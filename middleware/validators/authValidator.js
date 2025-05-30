import { body } from "express-validator";

// Validation rules for user login
export const loginValidation = [
	body("username")
		.exists({ checkFalsy: true })
		.withMessage("Username is required")
		.trim()
		.escape(),

	body("password")
		.notEmpty()
		.withMessage("Password is required.")
		.isString()
		.withMessage("Password must be a string."),
];
