import Order from "../models/order.model.js";
import Customer from "../models/customer.model.js"; // Needed for customer point updates
import User from "../models/user.model.js"; // Needed for handler existence check
import Service from "../models/service.model.js"; // Needed for service price check
import Discount from "../models/discount.model.js"; // Needed for discount details
import mongoose from "mongoose";

// Dotenv should ideally be configured once in your main app entry point (e.g., index.js)
// If MAGNIFICATION_FACTOR is used for calculation, ensure it's converted to a number.

export const getAllOrders = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		// Aggregation pipeline to calculate total_order_price and filter
		const pipeline = [
			{ $match: { isDeleted: false } }, // Filter out soft-deleted orders
			{ $sort: { orderDate: -1 } }, // Sort by order_date DESC
			{ $skip: skip }, // Pagination
			{ $limit: limit }, // Pagination
			{
				$project: {
					// Select and rename fields, calculate total price
					_id: 0, // Exclude _id from the root document as it will be orderId
					orderId: "$_id",
					customerId: "$customerId",
					customerInfo: "$customerInfo", // Embedded customer details
					orderDate: "$orderDate",
					handlerId: "$handlerId",
					handlerInfo: "$handlerInfo", // Embedded handler details
					orderStatus: "$orderStatus",
					discountId: "$discountId",
					discountInfo: "$discountInfo", // Embedded discount details
					services: "$services", // Keep embedded services for client if needed
					total_order_price: { $sum: "$services.totalPrice" }, // Calculate total price
				},
			},
		];

		const orders = await Order.aggregate(pipeline);

		const totalCount = await Order.countDocuments({ isDeleted: false });

		return res.status(200).json({
			success: true,
			data: orders,
			pagination: {
				total_record: totalCount,
				page: page,
				limit: limit,
				total_pages: Math.ceil(totalCount / limit),
			},
		});
	} catch (err) {
		console.error("Error in getAllOrders:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to fetch orders" });
	}
};

export const getCurrentOrdersForHandler = async (req, res) => {
	const { handler_id } = req.params; // Note: req.params.handler_id is a string, convert to ObjectId if needed for direct comparison
	const user_id = req.user?._id; // Access _id from the authenticated user object
	const user_role = req.user?.userRole; // Access userRole

	try {
		// Ensure handler_id from params is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(handler_id)) {
			return res.status(400).json({
				success: false,
				message: "Invalid handler ID format.",
			});
		}
		const handlerObjectId = new mongoose.Types.ObjectId(handler_id);

		// Authorization check
		if (
			!user_id ||
			(!user_id.equals(handlerObjectId) && user_role !== "admin")
		) {
			return res
				.status(401)
				.json({ success: false, message: "Unauthorized" });
		}

		// Check if handler_id exists in the users collection
		const handlerExists = await User.findById(handlerObjectId).select(
			"_id"
		);
		if (!handlerExists) {
			return res
				.status(404)
				.json({ success: false, message: "Handler not found" });
		}

		const pipeline = [
			{
				$match: {
					isDeleted: false,
					handlerId: handlerObjectId, // Match handlerId
					orderStatus: { $nin: ["completed", "cancelled"] }, // Not in completed or cancelled
				},
			},
			{ $sort: { orderDate: -1 } },
			{
				$project: {
					_id: 0,
					orderId: "$_id",
					customerId: "$customerId",
					customerInfo: "$customerInfo",
					orderDate: "$orderDate",
					handlerId: "$handlerId",
					handlerInfo: "$handlerInfo",
					orderStatus: "$orderStatus",
					discountId: "$discountId",
					discountInfo: "$discountInfo",
					total_order_price: { $sum: "$services.totalPrice" }, // Sum embedded services
					services: 0, // Exclude full services array if not needed in summary
				},
			},
		];

		const orders = await Order.aggregate(pipeline);

		if (orders.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				message: "No orders found being processed by the handler",
			});
		}

		return res.status(200).json({ success: true, data: orders });
	} catch (err) {
		console.error("Error in getCurrentOrdersForHandler:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to fetch orders" });
	}
};

export const getOrdersByDateRange = async (req, res) => {
	let { start, end } = req.query;

	if (!start && !end) {
		return res.status(400).json({
			success: false,
			message: "Start or end date is required.",
		});
	}

	let startDate = start ? new Date(start) : null;
	let endDate = end ? new Date(end) : null;

	if (
		(startDate && isNaN(startDate.getTime())) ||
		(endDate && isNaN(endDate.getTime()))
	) {
		return res
			.status(400)
			.json({ success: false, message: "Invalid date format." });
	}

	if (startDate && endDate && startDate > endDate) {
		return res.status(400).json({
			success: false,
			message: "Start date cannot be after end date.",
		});
	}

	// Adjust dates for full day range
	if (startDate) startDate.setHours(0, 0, 0, 0);
	if (endDate) endDate.setHours(23, 59, 59, 999);

	// Default dates if only one is provided
	if (startDate && !endDate) {
		endDate = new Date(); // Today
		endDate.setHours(23, 59, 59, 999);
	}

	if (!startDate && endDate) {
		startDate = new Date("1970-01-01T00:00:00Z"); // Epoch
	}

	const matchQuery = {
		isDeleted: false,
		orderDate: {
			// Use Mongoose's date range query operators
			...(startDate && { $gte: startDate }), // Greater than or equal to start date
			...(endDate && { $lte: endDate }), // Less than or equal to end date
		},
	};

	try {
		const pipeline = [
			{ $match: matchQuery },
			{ $sort: { orderDate: -1 } },
			{
				$project: {
					_id: 0,
					orderId: "$_id",
					customerId: "$customerId",
					customerInfo: "$customerInfo",
					orderDate: "$orderDate",
					handlerId: "$handlerId",
					handlerInfo: "$handlerInfo",
					orderStatus: "$orderStatus",
					discountId: "$discountId",
					discountInfo: "$discountInfo",
					total_order_price: { $sum: "$services.totalPrice" },
					services: 0, // Exclude full services array if not needed in summary
				},
			},
		];

		const orders = await Order.aggregate(pipeline);
		return res.status(200).json({ success: true, data: orders });
	} catch (err) {
		console.error("Error in getOrdersByDateRange:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to fetch orders" });
	}
};

export const getOrderDetailsById = async (req, res) => {
	const { id } = req.params;
	try {
		// Ensure id is a valid ObjectId
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid order ID format." });
		}

		// Find the order by its _id and ensure it's not deleted
		const order = await Order.findOne({ _id: id, isDeleted: false });

		if (!order) {
			return res
				.status(404)
				.json({ success: false, message: "Order not found" });
		}

		// Since customerInfo, handlerInfo, discountInfo, and services are embedded,
		// we can directly access them from the fetched order document.
		// We will calculate total_order_price on the fly.
		const totalOrderPrice = order.services.reduce(
			(sum, service) => sum + service.totalPrice,
			0
		);

		const responseData = order.toObject(); // Convert to plain object
		delete responseData.isDeleted; // Optional: clean up response

		// Add calculated total_order_price
		responseData.total_order_price = totalOrderPrice;

		return res.status(200).json({ success: true, data: responseData });
	} catch (err) {
		console.error("Error in getOrderDetailsById:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to fetch order details" });
	}
};

export const createOrder = async (req, res) => {
	const { customerId, handlerId, discountId, services } = req.body;
	const user = req.user;

	try {
		// 1. Validate incoming IDs and fetch necessary data
		if (!mongoose.Types.ObjectId.isValid(customerId)) {
			throw new Error("Invalid customer ID format.");
		}
		const customer = await Customer.findById(customerId); // Removed .session(session)
		if (!customer || customer.isDeleted) {
			throw new Error("Customer not found or deleted.");
		}

		let assignedHandlerId = null;
		let assignedHandlerInfo = null;

		if (user.userRole === "admin" || user.userRole === "manager") {
			if (handlerId) {
				if (!mongoose.Types.ObjectId.isValid(handlerId)) {
					throw new Error("Invalid handler ID format.");
				}
				const foundHandler = await User.findById(handlerId); // Removed .session(session)
				if (!foundHandler || foundHandler.isDeleted) {
					throw new Error("Handler not found or deleted.");
				}
				assignedHandlerId = foundHandler._id;
				assignedHandlerInfo = {
					username: foundHandler.username,
					userRole: foundHandler.userRole,
				};
			} else {
				assignedHandlerId = user._id;
				assignedHandlerInfo = {
					username: user.username,
					userRole: user.userRole,
				};
			}
		} else {
			if (handlerId) {
				throw new Error(
					"Only admins or managers can assign orders to other handlers."
				);
			}
			assignedHandlerId = user._id;
			assignedHandlerInfo = {
				username: user.username,
				userRole: user.userRole,
			};
		}

		let discount = null;
		if (discountId) {
			if (!mongoose.Types.ObjectId.isValid(discountId)) {
				throw new Error("Invalid discount ID format.");
			}
			discount = await Discount.findById(discountId); // Removed .session(session)
			if (!discount || discount.isDeleted) {
				throw new Error("Discount not found or deleted.");
			}

			if (customer.points < discount.requiredPoints) {
				throw new Error(
					"Customer does not have enough points for discount."
				);
			}
			customer.points -= discount.requiredPoints;
			await customer.save(); // Removed { session }
		}

		const embeddedServices = [];
		let subtotal = 0;

		for (const svc of services) {
			if (!mongoose.Types.ObjectId.isValid(svc.serviceId)) {
				throw new Error(
					`Invalid service ID format for service: ${svc.serviceId}`
				);
			}
			const serviceDoc = await Service.findById(svc.serviceId); // Removed .session(session)
			if (!serviceDoc || serviceDoc.isDeleted) {
				throw new Error(
					`Service with ID ${svc.serviceId} not found or deleted.`
				);
			}
			const totalPrice =
				svc.numberOfUnit * serviceDoc.servicePricePerUnit;

			subtotal += totalPrice;

			embeddedServices.push({
				serviceId: serviceDoc._id,
				serviceName: serviceDoc.serviceName,
				serviceUnit: serviceDoc.serviceUnit,
				pricePerUnit: serviceDoc.servicePricePerUnit,
				numberOfUnit: svc.numberOfUnit,
				totalPrice: totalPrice,
			});
		}

		const newOrder = new Order({
			customerId: customer._id,
			customerInfo: {
				firstName: customer.firstName,
				lastName: customer.lastName,
				phoneNumber: customer.phoneNumber,
			},
			handlerId: assignedHandlerId,
			handlerInfo: assignedHandlerInfo,
			discountId: discount ? discount._id : null,
			discountInfo: discount
				? {
						discountType: discount.discountType,
						amount: discount.amount,
				  }
				: null,
			services: embeddedServices,
			orderStatus: "pending",
		});

		let totalOrderPrice = subtotal;
		if (discount) {
			if (discount.discountType === "percent") {
				totalOrderPrice = subtotal * (1 - discount.amount / 100);
			} else if (discount.discountType === "fixed") {
				totalOrderPrice = subtotal - discount.amount;
			}

			if (totalOrderPrice < 0) {
				totalOrderPrice = 0;
			}
		}

		const savedOrder = await newOrder.save();

		const responseOrder = savedOrder.toObject();
		delete responseOrder.isDeleted;
		delete responseOrder.createdAt;
		delete responseOrder.updatedAt;

		return res.status(201).json({
			success: true,
			message: "Order created successfully",
			order: responseOrder,
			totalOrderPrice: totalOrderPrice,
		});
	} catch (err) {
		console.error("Error creating order:", err);
		if (err instanceof Error) {
			return res.status(400).json({
				success: false,
				message: err.message,
			});
		}
		return res.status(500).json({
			success: false,
			message: "Failed to create order",
			details: err.message,
		});
	}
};

export const updateOrderStatus = async (req, res) => {
	const { id } = req.params;
	const { orderStatus } = req.body; // Use camelCase
	const userRole = req.user?.userRole;

	try {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid order ID format." });
		}

		// Find the current order status
		const order = await Order.findOne({ _id: id, isDeleted: false }).select(
			"orderStatus"
		);

		if (!order) {
			return res.status(404).json({
				success: false,
				message: "Order not found or already deleted",
			});
		}

		// Check if order is already closed and allow admin bypass
		if (
			userRole !== "admin" &&
			(order.orderStatus === "completed" ||
				order.orderStatus === "cancelled")
		) {
			return res.status(401).json({
				success: false,
				message:
					"Unauthorized to change order status, order is already closed",
			});
		}

		// Update order status
		const updatedOrder = await Order.findOneAndUpdate(
			{ _id: id, isDeleted: false },
			{ $set: { orderStatus: orderStatus } },
			{ new: true, runValidators: true } // Run validators to ensure status is valid enum
		).select("_id orderStatus");

		if (!updatedOrder) {
			return res
				.status(404)
				.json({ success: false, message: "Order not found" });
		}

		return res.json({
			success: true,
			message: "Order status updated",
			order: updatedOrder,
		});
	} catch (err) {
		console.error("Error updating order status:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to update order status" });
	}
};

export const updateOrderByID = async (req, res) => {
	try {
		const { id } = req.params;
		const { orderStatus, handlerId, discountId } = req.body; // Use camelCase

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid order ID format." });
		}

		const updateFields = {};
		// Only update if provided and different from current (optional optimization)
		if (orderStatus !== undefined) updateFields.orderStatus = orderStatus;
		if (handlerId !== undefined) {
			// Validate handlerId if present and not null
			if (handlerId && !mongoose.Types.ObjectId.isValid(handlerId)) {
				return res.status(400).json({
					success: false,
					message: "Invalid handler ID format.",
				});
			}
			// Fetch handler info for embedding
			let handler = null;
			if (handlerId) {
				handler = await User.findById(handlerId).select(
					"username userRole"
				);
				if (!handler || handler.isDeleted) {
					// Assuming isDeleted for User is checked
					return res.status(404).json({
						success: false,
						message: "Handler not found or deleted.",
					});
				}
			}
			updateFields.handlerId = handler ? handler._id : null;
			updateFields.handlerInfo = handler
				? { username: handler.username, userRole: handler.userRole }
				: null;
		}
		if (discountId !== undefined) {
			// Allow null to reset discount
			// Validate discountId if present and not null
			if (discountId && !mongoose.Types.ObjectId.isValid(discountId)) {
				return res.status(400).json({
					success: false,
					message: "Invalid discount ID format.",
				});
			}
			// Fetch discount info for embedding
			let discount = null;
			if (discountId) {
				discount = await Discount.findById(discountId).select(
					"discountType amount"
				);
				if (!discount || discount.isDeleted) {
					// Assuming isDeleted for Discount is checked
					return res.status(404).json({
						success: false,
						message: "Discount not found or deleted.",
					});
				}
			}
			updateFields.discountId = discount ? discount._id : null;
			updateFields.discountInfo = discount
				? {
						discountType: discount.discountType,
						amount: discount.amount,
				  }
				: null;
		}

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		const updatedOrder = await Order.findOneAndUpdate(
			{ _id: id, isDeleted: false },
			{ $set: updateFields },
			{ new: true, runValidators: true } // Return updated doc, run validators
		).select(
			"customerId orderDate handlerId orderStatus discountId customerInfo handlerInfo discountInfo"
		); // Select fields to return

		if (!updatedOrder) {
			return res.status(404).json({
				success: false,
				message: "Order not found or is deleted",
			});
		}

		return res.status(200).json({
			success: true,
			message: "Order updated",
			order: updatedOrder,
		});
	} catch (err) {
		console.error("Error updating order by ID:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to update order" });
	}
};

export const deleteOrder = async (req, res) => {
	const { id } = req.params;
	try {
		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid order ID format." });
		}

		const result = await Order.findOneAndUpdate(
			{ _id: id, isDeleted: false },
			{ $set: { isDeleted: true } },
			{ new: true }
		);

		if (!result) {
			return res.status(404).json({
				success: false,
				message: "Order not found or is already deleted",
			});
		}

		return res.status(204).send(); // 204 No Content for successful soft delete
	} catch (err) {
		console.error("Error deleting order:", err);
		return res
			.status(500)
			.json({ success: false, message: "Failed to delete order" });
	}
};

export const addServiceToOrder = async (req, res) => {
	const { order_id } = req.params; // order_id from params, use camelCase for internal use
	const { numberOfUnit, serviceId } = req.body; // use camelCase
	const userRole = req.user?.userRole;
	const userId = req.user?._id; // Get ObjectId from authenticated user

	try {
		if (!mongoose.Types.ObjectId.isValid(order_id)) {
			throw new Error("Invalid order ID format.");
		}
		const orderObjectId = new mongoose.Types.ObjectId(order_id);

		if (!mongoose.Types.ObjectId.isValid(serviceId)) {
			throw new Error("Invalid service ID format.");
		}
		const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

		// 1. Check if order exists and is not deleted
		const order = await Order.findById(orderObjectId);
		if (!order || order.isDeleted) {
			throw new Error("Order not found or is deleted.");
		}

		// 2. Check if handler is the same as user (and if handlerId exists on the order)
		if (
			order.handlerId &&
			!userId.equals(order.handlerId) &&
			userRole !== "admin"
		) {
			throw new Error("Unauthorized to add service to order.");
		}

		// 3. Check if order is completed or cancelled
		if (
			order.orderStatus === "completed" ||
			order.orderStatus === "cancelled"
		) {
			throw new Error(
				"Order is already completed or cancelled! Cannot add more services."
			);
		}

		// 4. Check if service exists and is not deleted
		const serviceDoc = await Service.findOne({
			_id: serviceObjectId,
			isDeleted: false,
		});
		if (!serviceDoc) {
			throw new Error("Service not found or is deleted.");
		}

		// 5. Check if service is a duplicate in the order
		const isDuplicate = order.services.some((svc) =>
			svc.serviceId.equals(serviceObjectId)
		);
		if (isDuplicate) {
			throw new Error("Service is already added to order.");
		}

		// 6. Add service to the embedded array
		const totalPrice = numberOfUnit * serviceDoc.servicePricePerUnit;
		order.services.push({
			serviceId: serviceDoc._id,
			serviceName: serviceDoc.serviceName,
			serviceUnit: serviceDoc.serviceUnit,
			pricePerUnit: serviceDoc.servicePricePerUnit,
			numberOfUnit: numberOfUnit,
			totalPrice: totalPrice,
		});

		await order.save(); // Save the updated order document

		return res
			.status(201)
			.json({ success: true, message: "Service added to order" });
	} catch (err) {
		console.error("Error adding service to order:", err);
		return res.status(500).json({
			success: false,
			message: "Failed to add service to order",
			details: err.message,
		});
	}
};

export const updateOrderService = async (req, res) => {
	const { order_id, service_id } = req.params; // use camelCase for internal use
	const { numberOfUnit } = req.body; // use camelCase
	const userRole = req.user?.userRole;
	const userId = req.user?._id;

	try {
		if (!mongoose.Types.ObjectId.isValid(order_id)) {
			throw new Error("Invalid order ID format.");
		}
		const orderObjectId = new mongoose.Types.ObjectId(order_id);

		if (!mongoose.Types.ObjectId.isValid(service_id)) {
			throw new Error("Invalid service ID format.");
		}
		const serviceObjectId = new mongoose.Types.ObjectId(service_id);

		// 1. Check if order exists and is not deleted
		const order = await Order.findById(orderObjectId);
		if (!order || order.isDeleted) {
			throw new Error("Order not found or is deleted.");
		}

		// 2. Check if handler is the same as user (and if handlerId exists on the order)
		if (
			order.handlerId &&
			!userId.equals(order.handlerId) &&
			userRole !== "admin"
		) {
			throw new Error("Unauthorized to update service in order.");
		}

		// 3. Check if order is completed or cancelled
		if (
			order.orderStatus === "completed" ||
			order.orderStatus === "cancelled"
		) {
			throw new Error(
				"Order is already completed or cancelled! Cannot update services."
			);
		}

		// 4. Find the service within the embedded array
		const serviceIndex = order.services.findIndex((svc) =>
			svc.serviceId.equals(serviceObjectId)
		);
		if (serviceIndex === -1) {
			throw new Error("Service not found in order.");
		}

		// 5. Update service detail (number_of_unit and total_price)
		// Recalculate total_price based on stored pricePerUnit
		const historicalPricePerUnit =
			order.services[serviceIndex].pricePerUnit;
		order.services[serviceIndex].numberOfUnit = numberOfUnit;
		order.services[serviceIndex].totalPrice =
			numberOfUnit * historicalPricePerUnit;

		await order.save(); // Save the updated order document

		return res.json({
			success: true,
			message: "Service quantity updated in order",
		});
	} catch (err) {
		console.error("Error updating service in order:", err);
		return res.status(500).json({
			success: false,
			message: "Failed to update service in order",
			details: err.message,
		});
	}
};

export const removeServiceFromOrder = async (req, res) => {
	const { order_id, service_id } = req.params; // use camelCase for internal use
	const userRole = req.user?.userRole;
	const userId = req.user?._id;

	try {
		if (!mongoose.Types.ObjectId.isValid(order_id)) {
			throw new Error("Invalid order ID format.");
		}
		const orderObjectId = new mongoose.Types.ObjectId(order_id);

		if (!mongoose.Types.ObjectId.isValid(service_id)) {
			throw new Error("Invalid service ID format.");
		}
		const serviceObjectId = new mongoose.Types.ObjectId(service_id);

		// 1. Check if order exists and is not deleted
		const order = await Order.findById(orderObjectId);
		if (!order || order.isDeleted) {
			throw new Error("Order not found or is deleted.");
		}

		// 2. Check if handler is the same as user (and if handlerId exists on the order)
		if (
			order.handlerId &&
			!userId.equals(order.handlerId) &&
			userRole !== "admin"
		) {
			throw new Error("Unauthorized to remove service from order.");
		}

		// 3. Check if order is completed or cancelled
		if (
			order.orderStatus === "completed" ||
			order.orderStatus === "cancelled"
		) {
			throw new Error(
				"Order is already completed or cancelled! Cannot remove services."
			);
		}

		// 4. Find the service within the embedded array and remove it
		const initialServiceCount = order.services.length;
		order.services = order.services.filter(
			(svc) => !svc.serviceId.equals(serviceObjectId)
		);

		if (order.services.length === initialServiceCount) {
			// If the length hasn't changed, the service wasn't found in the array
			throw new Error("Service not found in order.");
		}

		await order.save(); // Save the updated order document

		return res.json({
			success: true,
			message: "Service removed from order",
		});
	} catch (err) {
		console.error("Error removing service from order:", err);
		return res.status(500).json({
			success: false,
			message: "Failed to remove service from order",
			details: err.message,
		});
	}
};
