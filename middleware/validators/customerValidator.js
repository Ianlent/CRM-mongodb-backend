import { body } from "express-validator";

export const createCustomerValidation = [
	body("firstName")
		.exists({ checkFalsy: true })
		.withMessage("First name is required")
		.isLength({ min: 2, max: 32 })
		.withMessage("First name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("lastName")
		.exists({ checkFalsy: true })
		.withMessage("Last name is required")
		.isLength({ min: 2, max: 32 })
		.withMessage("Last name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.isMobilePhone("any", { strictMode: true })
		.withMessage(
			"Invalid phone number; must be in international E.164 format"
		)
		.trim(),

	body("address")
		.not()
		.isEmpty()
		.withMessage("Address is required")
		.isLength({ min: 5, max: 128 })
		.withMessage("Address must be between 5 and 128 characters")
		.trim()
		.escape(),

	body("points")
		.optional({ nullable: true })
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer"),
];

export const updateCustomerValidation = [
	body("firstName")
		.optional({ checkFalsy: true })
		.isLength({ min: 2, max: 32 })
		.withMessage("First name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("lastName")
		.optional({ checkFalsy: true })
		.isLength({ min: 2, max: 32 })
		.withMessage("Last name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.isMobilePhone("any", { strictMode: true })
		.withMessage(
			"Invalid phone number; must be in international E.164 format"
		)
		.trim(),

	body("address")
		.optional({ checkFalsy: true })
		.isLength({ min: 5, max: 128 })
		.withMessage("Address must be between 5 and 128 characters")
		.trim()
		.escape(),

	body("points")
		.optional({ nullable: true })
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer"),
];
