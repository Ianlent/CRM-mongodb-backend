import { body } from "express-validator";

const discountTypes = ["percent", "fixed"]; // example, adjust to your actual enum

export const createDiscountValidation = [
	body("discountName")
		.exists()
		.withMessage("Discount name is required")
		.isString()
		.withMessage("Discount name must be a string")
		.isLength({ max: 30 })
		.withMessage("Discount name can't be longer than 30 characters")
		.trim()
		.escape(),

	body("requiredPoints")
		.exists()
		.withMessage("Required points is required")
		.isInt({ min: 0 })
		.withMessage("Required points must be a non-negative integer"),

	body("discountType")
		.exists()
		.withMessage("Discount type is required")
		.isIn(discountTypes)
		.withMessage(
			`Discount type must be one of: [${discountTypes.join(", ")}]`
		),

	body("amount")
		.exists()
		.withMessage("Amount is required")
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),
];

export const updateDiscountValidation = [
	body("discountName")
		.optional()
		.isString()
		.withMessage("Discount name must be a string")
		.isLength({ max: 30 })
		.withMessage("Discount name can't be longer than 30 characters")
		.trim()
		.escape(),

	body("requiredPoints")
		.optional()
		.isInt({ min: 0 })
		.withMessage("Required points must be a non-negative integer"),

	body("discountType")
		.optional()
		.isIn(discountTypes)
		.withMessage(
			`Discount type must be one of: ${discountTypes.join(", ")}`
		),

	body("amount")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),
];
