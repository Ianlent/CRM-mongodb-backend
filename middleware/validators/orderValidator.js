import { body, param } from "express-validator";

// Validator for creating a new order
export const createOrderValidation = [
	body("customerId")
		.notEmpty()
		.withMessage("Customer ID is required")
		.isMongoId()
		.withMessage("Customer ID must be a valid MongoDB ID"),

	body("handlerId")
		.optional({ nullable: true })
		.isMongoId()
		.withMessage("Handler ID must be a valid MongoDB ID if provided"),

	body("discountId")
		.optional({ nullable: true })
		.isMongoId()
		.withMessage("Discount ID must be a valid MongoDB ID if provided"),

	body("services")
		.isArray({ min: 1 })
		.withMessage("At least one service must be provided"),

	body("services.*.serviceId")
		.notEmpty()
		.withMessage("Service ID is required for each service")
		.isMongoId()
		.withMessage("Service ID must be a valid MongoDB ID"),

	body("services.*.numberOfUnit")
		.notEmpty()
		.withMessage("Unit number is required for each service")
		.isInt({ gt: 0 })
		.withMessage("Unit must be a positive integer"),
];

export const updateOrderValidation = [
	body("handlerId")
		.optional({ nullable: true })
		.isMongoId()
		.withMessage("Handler ID must be a valid MongoDB ID if provided"),

	body("discountId")
		.optional({ nullable: true })
		.isMongoId()
		.withMessage("Discount ID must be a valid MongoDB ID if provided"),

	body("orderStatus")
		.optional()
		.isIn(["pending", "confirmed", "completed", "cancelled"])
		.withMessage(
			"Order status must be one of the following: 'pending', 'confirmed', 'completed', 'cancelled'"
		),
];

export const addServiceToOrderValidation = [
	param("order_id")
		.exists()
		.withMessage("Order ID is required")
		.notEmpty()
		.withMessage("Order ID is required")
		.isMongoId()
		.withMessage("Order ID must be a valid MongoDB ID"),
	body("serviceId")
		.notEmpty()
		.withMessage("Service ID is required")
		.isMongoId()
		.withMessage("Service ID must be a valid MongoDB ID"),

	body("numberOfUnit")
		.notEmpty()
		.withMessage("Unit number is required")
		.isInt({ gt: 0 })
		.withMessage("Unit must be a positive integer"),
];

export const updateServiceInOrderValidation = [
	param("order_id")
		.exists()
		.withMessage("Order ID is required")
		.notEmpty()
		.withMessage("Order ID is required")
		.isMongoId()
		.withMessage("Order ID must be a valid MongoDB ID"),
	param("service_id")
		.exists()
		.withMessage("Service ID is required")
		.notEmpty()
		.withMessage("Service ID is required")
		.isMongoId()
		.withMessage("Service ID must be a valid MongoDB ID"),
	body("numberOfUnit")
		.notEmpty()
		.withMessage("Unit number is required")
		.isInt({ gt: 0 })
		.withMessage("Unit must be a positive integer"),
];

export const removeServiceFromOrderValidation = [
	param("order_id")
		.exists()
		.withMessage("Order ID is required")
		.notEmpty()
		.withMessage("Order ID is required")
		.isMongoId()
		.withMessage("Order ID must be a valid MongoDB ID"),
	param("service_id")
		.notEmpty()
		.withMessage("Service ID is required")
		.isMongoId()
		.withMessage("Service ID must be a valid MongoDB ID"),
];

export const checkHandlerParamValidation = [
	param("handler_id")
		.exists()
		.withMessage("Handler ID is required")
		.notEmpty()
		.withMessage("Handler ID cannot be empty")
		.isMongoId()
		.withMessage("Handler ID must be a valid MongoDB ID"),
];
