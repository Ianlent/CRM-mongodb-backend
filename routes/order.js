import express from "express";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

// Controller functions
import {
	getAllOrders,
	getCurrentOrdersForHandler,
	getOrderDetailsById,
	createOrder,
	updateOrderStatus,
	updateOrderByID,
	deleteOrder,
	addServiceToOrder,
	updateOrderService,
	removeServiceFromOrder,
} from "../controller/orderController.js";

// Middleware
import authorizeRoles from "../middleware/auth/authorizeRoles.js";

// Validators
import {
	createOrderValidation,
	updateOrderValidation,
	addServiceToOrderValidation,
	updateServiceInOrderValidation,
	removeServiceFromOrderValidation,
	checkHandlerParamValidation,
} from "../middleware/validators/orderValidator.js";
import { validateIdParam } from "../middleware/validators/idValidator.js";

const router = express.Router();
// Public/Employee accessible routes
// GET a specific order by ID
router.get(
	"/:id",
	validateIdParam, // Apply specific validation for this route
	handleValidationErrors,
	getOrderDetailsById
);

// GET current orders for a specific handler
router.get(
	"/current/:handler_id",
	checkHandlerParamValidation,
	handleValidationErrors,
	getCurrentOrdersForHandler
);

// PUT update the status of an order
router.put(
	"/:id/status",
	validateIdParam,
	updateOrderValidation,
	handleValidationErrors,
	updateOrderStatus
);

// POST create a new order
router.post("/", createOrderValidation, handleValidationErrors, createOrder);

// Optional service management within orders
// Add service to order
router.post(
	"/:order_id/services",
	addServiceToOrderValidation,
	handleValidationErrors,
	addServiceToOrder
);

// Update quantity of a service in an order
router.put(
	"/:order_id/services/:service_id",
	updateServiceInOrderValidation, // This now includes both param validations
	handleValidationErrors,
	updateOrderService
);

// Remove service from an order
router.delete(
	"/:order_id/services/:service_id",
	removeServiceFromOrderValidation, // This now includes both param validations
	handleValidationErrors,
	removeServiceFromOrder
);

// Admin or manager only routes
router.use(authorizeRoles(["admin", "manager"]));

// GET orders by date range
router.get("/", handleValidationErrors, getAllOrders);

// PUT update an order by ID (handler, discount, status, etc.)
router.put(
	"/:id",
	updateOrderValidation, // This now includes param('id') validation
	handleValidationErrors,
	updateOrderByID
);

// DELETE (soft delete) an order
router.delete("/:id", validateIdParam, handleValidationErrors, deleteOrder);

export default router;
