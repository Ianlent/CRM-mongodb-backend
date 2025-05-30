import { body } from "express-validator";

export const createExpenseValidation = [
	body("amount")
		.exists()
		.withMessage("Amount is required")
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),

	body("expenseDescription")
		.optional()
		.isString()
		.withMessage("Description must be a string")
		.isLength({ max: 50 })
		.withMessage("Description can't be longer than 50 characters")
		.trim()
		.escape(),
];

export const updateExpenseValidation = [
	body("amount")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),

	body("expenseDate")
		.optional()
		.isISO8601()
		.withMessage("Expense date must be a valid ISO 8601 date"),

	body("expenseDescription")
		.optional()
		.isString()
		.withMessage("Description must be a string")
		.isLength({ max: 50 })
		.withMessage("Description can't be longer than 50 characters")
		.trim()
		.escape(),
];
