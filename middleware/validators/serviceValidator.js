import { body } from "express-validator";

export const createServiceValidation = [
	body("serviceName")
		.exists()
		.withMessage("Service name is required")
		.isString()
		.withMessage("Service name must be a string")
		.isLength({ min: 1, max: 30 })
		.withMessage("Service name must be 1-30 characters long")
		.trim()
		.escape(),

	body("serviceUnit")
		.exists()
		.withMessage("Service unit is required")
		.isString()
		.withMessage("Service unit must be a string")
		.isLength({ min: 1, max: 20 })
		.withMessage("Service unit must be 1-20 characters long")
		.trim()
		.escape(),

	body("servicePricePerUnit")
		.exists()
		.withMessage("Price per unit is required")
		.isInt({ gt: 0 })
		.withMessage("Price per unit must be a positive integer"),
];

export const updateServiceValidation = [
	body("serviceName")
		.optional()
		.isString()
		.withMessage("Service name must be a string")
		.isLength({ min: 1, max: 30 })
		.withMessage("Service name must be 1-30 characters long")
		.trim()
		.escape(),

	body("serviceUnit")
		.optional()
		.isString()
		.withMessage("Service unit must be a string")
		.isLength({ min: 1, max: 20 })
		.withMessage("Service unit must be 1-20 characters long")
		.trim()
		.escape(),

	body("servicePricePerUnit")
		.optional()
		.isInt({ gt: 0 })
		.withMessage("Price per unit must be a positive integer"),
];
