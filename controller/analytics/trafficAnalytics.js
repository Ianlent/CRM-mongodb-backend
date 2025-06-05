import Order from "../../models/order.model.js";

export const getOrderTrafficSummary = async (req, res) => {
	try {
		const { start, end } = req.query;

		// 1. Input Validation and Date Handling
		if (!start && !end) {
			return res.status(400).json({
				success: false,
				message: "Start or end date is required.",
			});
		}

		let startDate = start ? new Date(start) : null;
		let endDate = end ? new Date(end) : null;

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

		// 2. Aggregate Daily Order Volume and Status Counts
		const dailyOrderSummary = await Order.aggregate([
			{
				// Match orders within the specified date range and not soft-deleted
				$match: {
					orderDate: { $gte: startDate, $lte: endDate },
					isDeleted: false,
				},
			},
			{
				// Group by date and count orders by their status
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$orderDate",
						},
					},
					count: { $sum: 1 }, // Total orders for the day
					completedCount: {
						$sum: {
							$cond: [
								{ $eq: ["$orderStatus", "completed"] },
								1,
								0,
							], // Count if status is 'completed'
						},
					},
					cancelledCount: {
						$sum: {
							$cond: [
								{ $eq: ["$orderStatus", "cancelled"] },
								1,
								0,
							], // Count if status is 'cancelled'
						},
					},
					// Add other statuses if needed, e.g.,
					// pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
				},
			},
			{
				// Sort the results by date in ascending order
				$sort: { _id: 1 },
			},
		]);

		// 3. Calculate Overall Totals for different statuses
		let overallTotalVolume = 0;
		let overallTotalCompletedVolume = 0;
		let overallTotalCancelledVolume = 0;

		dailyOrderSummary.forEach((day) => {
			overallTotalVolume += day.count;
			overallTotalCompletedVolume += day.completedCount;
			overallTotalCancelledVolume += day.cancelledCount;
		});

		// 4. Prepare and Send Response
		res.status(200).json({
			success: true,
			message: "Order volume summary fetched successfully.",
			data: {
				dailyVolume: dailyOrderSummary.map((day) => ({
					date: day._id,
					count: day.count,
					completedCount: day.completedCount,
					cancelledCount: day.cancelledCount,
				})), // Rename _id to date and include other counts
				overallTotalVolume: overallTotalVolume,
				overallTotalCompletedVolume: overallTotalCompletedVolume,
				overallTotalCancelledVolume: overallTotalCancelledVolume,
			},
		});
	} catch (error) {
		console.error("Error fetching order volume summary:", error);
		res.status(500).json({
			success: false,
			message:
				"An error occurred while fetching the order volume summary.",
			error: error.message,
		});
	}
};
