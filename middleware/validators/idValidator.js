import { param } from "express-validator";

// Validation rules for validating an ID parameter (e.g., for GET /users/:id, PUT /users/:id, DELETE /users/:id)
export const validateIdParam = [
	param("id")
		.exists()
		.withMessage("ID parameter is required.")
		.notEmpty()
		.withMessage("ID parameter cannot be empty.")
		.isMongoId() // Checks if the string is a valid MongoDB ObjectId format
		.withMessage("Invalid ID format. Must be a valid MongoDB ObjectId."),
];
