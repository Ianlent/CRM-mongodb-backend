import { body } from "express-validator";

const discountTypes = ["percent", "fixed"]; // example, adjust to your actual enum

export const createDiscountValidation = [
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
