import Order from "../models/order.model.js";
import Customer from "../models/customer.model.js"; // Needed for customer point updates
import User from "../models/user.model.js"; // Needed for handler existence check
import Service from "../models/service.model.js"; // Needed for service price check
import Discount from "../models/discount.model.js"; // Needed for discount details
import mongoose from "mongoose";

// Dotenv should ideally be configured once in your main app entry point (e.g., index.js)
// If MAGNIFICATION_FACTOR is used for calculation, ensure it's converted to a number.

export const getDailyOrderDetailsForAnalytics = async (req, res) => {
	try {
		const { start, end, page = 1, limit = 10 } = req.query; // Add page and limit

		// Convert to numbers
		const pageNumber = parseInt(page, 10);
		const limitNumber = parseInt(limit, 10);
		const skip = (pageNumber - 1) * limitNumber;

		// Input validation and date adjustment (same as getFinancialSummary for consistency)
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

		const currentDate = new Date();
		currentDate.setHours(23, 59, 59, 999);

		if (endDate && endDate > currentDate) {
			return res.status(400).json({
				success: false,
				message: "End date cannot be in the future.",
			});
		}

		if (startDate) startDate.setHours(0, 0, 0, 0);
		if (endDate) endDate.setHours(23, 59, 59, 999);

		if (startDate && !endDate) {
			endDate = new Date();
			endDate.setHours(23, 59, 59, 999);
		}

		if (!startDate && endDate) {
			startDate = new Date("1970-01-01T00:00:00Z");
		}

		// Use $facet to get total count and paginated results in one aggregation
		const result = await Order.aggregate([
			{
				$match: {
					orderStatus: "completed",
					completedOn: { $gte: startDate, $lte: endDate },
					isDeleted: false,
				},
			},
			// Re-calculate orderNetTotal before grouping/facet for accurate totals/details
			{
				$addFields: {
					orderGrossTotal: {
						$reduce: {
							input: "$services",
							initialValue: 0,
							in: { $add: ["$$value", "$$this.totalPrice"] },
						},
					},
				},
			},
			{
				$addFields: {
					orderNetTotal: {
						$cond: {
							if: "$discountInfo",
							then: {
								$cond: {
									if: {
										$eq: [
											"$discountInfo.discountType",
											"percent",
										],
									},
									then: {
										$multiply: [
											"$orderGrossTotal",
											{
												$subtract: [
													1,
													{
														$divide: [
															"$discountInfo.amount",
															100,
														],
													},
												],
											},
										],
									},
									else: {
										$subtract: [
											"$orderGrossTotal",
											"$discountInfo.amount",
										],
									},
								},
							},
							else: "$orderGrossTotal",
						},
					},
				},
			},
			{
				$facet: {
					paginatedResults: [
						// Grouping for pagination
						{
							$group: {
								_id: {
									$dateToString: {
										format: "%Y-%m-%d",
										date: "$completedOn",
									},
								},
								orders: {
									$push: {
										_id: "$_id",
										customerInfo: "$customerInfo",
										netTotal: "$orderNetTotal",
									},
								},
								dailyRevenue: { $sum: "$orderNetTotal" },
							},
						},
						{
							$project: {
								_id: 0,
								date: "$_id",
								revenue: "$dailyRevenue",
								orders: 1,
							},
						},
						{
							$sort: { date: -1 },
						},
						{ $skip: skip },
						{ $limit: limitNumber },
					],
					totalCount: [
						// Count total documents after initial match, before pagination
						{
							$group: {
								_id: {
									$dateToString: {
										format: "%Y-%m-%d",
										date: "$completedOn",
									},
								},
							},
						},
						{ $count: "count" },
					],
				},
			},
		]);

		const dailyOrderDetails = result[0].paginatedResults;
		const totalCount = result[0].totalCount[0]?.count || 0;

		res.status(200).json({
			success: true,
			message: "Daily order details fetched successfully",
			data: dailyOrderDetails,
			totalCount: totalCount,
			currentPage: pageNumber,
			pageSize: limitNumber,
			totalPages: Math.ceil(totalCount / limitNumber),
		});
	} catch (error) {
		console.error("Error fetching daily order details:", error);
		res.status(500).json({
			success: false,
			message: "Server error",
			error: error.message,
		});
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

export const getAllOrders = async (req, res) => {
	try {
		const { date, page = 1, limit = 10 } = req.query;

		const parsedLimit = parseInt(limit);
		const parsedPage = parseInt(page);
		const skip = (parsedPage - 1) * parsedLimit;

		// Input validation for the single date
		let targetDate = date ? new Date(date) : null;

		if (!targetDate || isNaN(targetDate.getTime())) {
			return res.status(400).json({
				success: false,
				message: "Invalid or missing date parameter.",
			});
		}

		// Set the start and end of the target date to cover the full day
		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);

		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		// Prevent target date from being in the future relative to the current date
		const currentDate = new Date();
		currentDate.setHours(23, 59, 59, 999); // Set to end of current day for comparison

		if (endOfDay > currentDate) {
			return res.status(400).json({
				success: false,
				message: "Date cannot be in the future.",
			});
		}

		// Base match for filtering out soft-deleted orders
		let matchStage = { isDeleted: false };

		// Add date filtering for the single target date
		matchStage.orderDate = {
			$gte: startOfDay,
			$lte: endOfDay,
		};

		// Aggregation pipeline for daily summary
		const pipeline = [
			{ $match: matchStage }, // 1. Apply initial filters including the single date
			{
				$group: {
					// 2. Group by the single date
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$orderDate",
						},
					},
					orders: {
						$push: {
							orderId: "$_id",
							customerId: "$customerId",
							customerInfo: "$customerInfo",
							orderDate: "$orderDate",
							handlerId: "$handlerId",
							handlerInfo: "$handlerInfo",
							orderStatus: "$orderStatus",
							discountId: "$discountId",
							discountInfo: "$discountInfo",
							services: "$services",
							completedOn: "$completedOn",
							// Calculate total_order_price for each order within the array
							total_order_price: { $sum: "$services.totalPrice" }, // This might be an issue.
							// To sum totalPrice for each order, you'd typically need to unwind services first.
							// If services is an array of objects with a totalPrice field, you can sum them like this:
							// total_order_price: { $sum: "$services.totalPrice" },
							// If 'services' itself has a 'totalPrice' directly (which seems less likely for a services array),
							// then the current approach would work.
							// Assuming 'services' is an array of objects, and each object has a 'totalPrice':
							// To correctly sum services.totalPrice for each individual order *before* grouping,
							// you'd typically calculate it in a $addFields stage before the $group.
							// For simplicity, if total_order_price is a field already present in the order document, use that.
							// If not, and you want to calculate it from the 'services' array for each order,
							// you'd need an $addFields stage before $group or adjust how totalPrice is stored.
							// For this specific aggregation, assuming "total_order_price" is a calculated field
							// that you want to include for each order being pushed. If "$services.totalPrice"
							// correctly sums up prices within the 'services' array for a single order, keep it.
							// Otherwise, consider if 'total_order_price' should be a field directly on the Order model
							// or calculated differently.
						},
					},
				},
			},
			{ $sort: { _id: -1 } }, // 3. Sort daily summaries by date DESC (will only have one date in this case)
			{
				$project: {
					// 4. Reshape the output
					_id: 0, // Exclude the default _id from group
					date: "$_id",
					orders: 1,
				},
			},
		];

		// Execute aggregation for daily summarized orders
		const dailyOrders = await Order.aggregate(pipeline);

		// totalCount will be the number of daily summaries (should be 0 or 1 in this case)
		const totalCount = dailyOrders.length;

		// Apply pagination to the daily summaries (even if only one, it still applies)
		const paginatedDailyOrders = dailyOrders.slice(
			skip,
			skip + parsedLimit
		);

		return res.status(200).json({
			success: true,
			data: paginatedDailyOrders,
			pagination: {
				total_records: totalCount,
				page: parsedPage,
				limit: parsedLimit,
				total_pages: Math.ceil(totalCount / parsedLimit),
			},
		});
	} catch (err) {
		console.error("Error in getAllOrders:", err);
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

		let totalOrderPrice = subtotal;
		if (discount) {
			if (discount.discountType === "percent") {
				totalOrderPrice = subtotal * (1 - discount.amount / 100);
			} else if (discount.discountType === "fixed") {
				totalOrderPrice = subtotal - discount.amount;
			}

			if (totalOrderPrice < 0) {
				return res.status(400).json({
					success: false,
					message: "Discount amount exceeds the total order price.",
				});
			}
		}

		const newOrder = new Order({
			customerId: customer._id,
			customerInfo: {
				firstName: customer.firstName,
				lastName: customer.lastName,
				phoneNumber: customer.phoneNumber,
				address: customer.address, // Added address here
			},
			handlerId: assignedHandlerId,
			handlerInfo: assignedHandlerInfo,
			discountId: discount ? discount._id : null,
			discountInfo: discount
				? {
						discountType: discount.discountType,
						discountName: discount.discountName,
						amount: discount.amount,
				  }
				: null,
			services: embeddedServices,
			orderStatus: "pending",
		});

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

		const updateFields = { orderStatus: orderStatus };
		// Set completedOn if the status is changing to 'completed'
		if (orderStatus === "completed") {
			updateFields.completedOn = new Date();
		} else if (
			order.orderStatus === "completed" &&
			orderStatus !== "completed"
		) {
			// If status is changing from 'completed' to something else, clear completedOn
			updateFields.completedOn = null;
		}

		// Update order status
		const updatedOrder = await Order.findOneAndUpdate(
			{ _id: id, isDeleted: false },
			{ $set: updateFields },
			{ new: true, runValidators: true } // Return updated doc, run validators
		).select("_id orderStatus completedOn"); // Select completedOn to be returned

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
		const { orderStatus, handlerId } = req.body; // Use camelCase

		if (!mongoose.Types.ObjectId.isValid(id)) {
			return res
				.status(400)
				.json({ success: false, message: "Invalid order ID format." });
		}

		const updateFields = {};
		// Fetch the existing order to check current status for completedOn logic
		const existingOrder = await Order.findById(id).select(
			"orderStatus completedOn"
		);

		if (!existingOrder || existingOrder.isDeleted) {
			return res.status(404).json({
				success: false,
				message: "Order not found or is deleted",
			});
		}

		// Only update if provided and different from current (optional optimization)
		if (
			orderStatus !== undefined &&
			orderStatus !== existingOrder.orderStatus
		) {
			updateFields.orderStatus = orderStatus;
			// Logic for completedOn based on status change
			if (orderStatus === "completed") {
				updateFields.completedOn = new Date();
			} else if (
				existingOrder.orderStatus === "completed" &&
				orderStatus !== "completed"
			) {
				updateFields.completedOn = null; // Clear completedOn if status changes from completed
			}
		}

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
			"customerId orderDate handlerId orderStatus discountId customerInfo handlerInfo discountInfo completedOn" // Include completedOn in select
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
	let userId = req.user?._id;

	try {
		if (!mongoose.Types.ObjectId.isValid(order_id)) {
			throw new Error("Invalid order ID format.");
		}
		const orderObjectId = new mongoose.Types.ObjectId(order_id);

		if (!mongoose.Types.ObjectId.isValid(serviceId)) {
			throw new Error("Invalid service ID format.");
		}
		const serviceObjectId = new mongoose.Types.ObjectId(serviceId);

		// 0. Convert user ID to ObjectId
		if (!userId) {
			throw new Error(
				"User ID not found in request. Authentication required."
			);
		}
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			throw new Error("Invalid user ID format.");
		}
		userId = new mongoose.Types.ObjectId(userId);

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
		const serviceIndex = order.services.findIndex((svc) =>
			svc.serviceId.equals(serviceObjectId)
		);

		if (serviceIndex !== -1) {
			// Service is a duplicate, update its quantity and total price
			const existingService = order.services[serviceIndex];
			existingService.numberOfUnit += numberOfUnit; // Add the new quantity
			existingService.totalPrice =
				existingService.numberOfUnit * existingService.pricePerUnit; // Recalculate total price

			await order.save(); // Save the updated order document

			return res
				.status(200) // Use 200 for successful update
				.json({
					success: true,
					message: "Service quantity updated in order",
				});
		} else {
			// Service is not a duplicate, add it to the embedded array
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
		}
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
	let userId = req.user?._id;

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

		if (!userId) {
			throw new Error(
				"User ID not found in request. Authentication required."
			);
		}
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			throw new Error("Invalid user ID format.");
		}
		userId = new mongoose.Types.ObjectId(userId);
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
	let userId = req.user?._id;

	try {
		if (!mongoose.Types.ObjectId.isValid(order_id)) {
			throw new Error("Invalid order ID format.");
		}
		const orderObjectId = new mongoose.Types.ObjectId(order_id);

		if (!mongoose.Types.ObjectId.isValid(service_id)) {
			throw new Error("Invalid service ID format.");
		}
		const serviceObjectId = new mongoose.Types.ObjectId(service_id);

		// 0. Convert user_id to ObjectId
		if (!userId) {
			throw new Error(
				"User ID not found in request. Authentication required."
			);
		}
		if (!mongoose.Types.ObjectId.isValid(userId)) {
			throw new Error("Invalid user ID format.");
		}
		userId = new mongoose.Types.ObjectId(userId);

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
