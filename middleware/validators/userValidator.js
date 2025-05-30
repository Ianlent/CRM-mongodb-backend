import { body } from "express-validator";

// Validation rules for Admin creating a new user (POST /users)
export const createUserValidation = [
	body("username")
		.exists({ checkFalsy: true })
		.withMessage("Username is required")
		.isLength({ min: 3, max: 32 })
		.withMessage("Username must be between 3 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.isMobilePhone("any", { strictMode: true })
		.withMessage(
			"Invalid phone number; must be in international E.164 format"
		)
		.trim(),

	body("password")
		.exists({ checkFalsy: true })
		.withMessage("Password is required")
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters")
		.matches(/[A-Z]/)
		.withMessage("Password must contain at least one uppercase letter")
		.matches(/[0-9]/)
		.withMessage("Password must contain at least one number"),

	body("userRole")
		.exists({ checkFalsy: true })
		.withMessage("User role is required")
		.isIn(["employee", "manager", "admin"])
		.withMessage("Invalid user role"),
];

// Validation rules for Admin updating an existing user (PUT /users/:id)
export const updateUserValidation = [
	body("username")
		.optional({ checkFalsy: true })
		.isLength({ min: 3, max: 32 })
		.withMessage("Username must be between 3 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.isMobilePhone("any", { strictMode: true })
		.withMessage(
			"Invalid phone number; must be in international E.164 format"
		)
		.trim(),

	body("password")
		.optional({ checkFalsy: true })
		.isLength({ min: 8 })
		.withMessage("Password must be at least 8 characters")
		.matches(/[A-Z]/)
		.withMessage("Password must contain at least one uppercase letter")
		.matches(/[0-9]/)
		.withMessage("Password must contain at least one number"),

	body("userRole")
		.optional({ checkFalsy: true })
		.isIn(["employee", "manager", "admin"])
		.withMessage("Invalid user role"),
];
