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

	body("expenseDate")
		.exists()
		.withMessage("Expense date is required")
		.isISO8601()
		.withMessage("Expense date must be a valid ISO 8601 date")
		.custom((value) => {
			const expenseDay = new Date(value);
			const today = new Date().setHours(23, 59, 59, 999);
			if (expenseDay > today) {
				throw new Error("Expense date cannot be in the future");
			}
			return true;
		}),
];

export const updateExpenseValidation = [
	body("amount")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Amount must be a positive integer"),

	body("expenseDate")
		.optional()
		.isISO8601()
		.withMessage("Expense date must be a valid ISO 8601 date")
		.custom((value) => {
			const expenseDay = new Date(value);
			const today = new Date().setHours(23, 59, 59, 999);
			if (expenseDay > today) {
				throw new Error("Expense date cannot be in the future");
			}
			return true;
		}),

	body("expenseDescription")
		.optional()
		.isString()
		.withMessage("Description must be a string")
		.isLength({ max: 50 })
		.withMessage("Description can't be longer than 50 characters")
		.trim()
		.escape(),
];
