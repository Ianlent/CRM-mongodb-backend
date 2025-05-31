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

		// 2. Aggregate Daily Order Volume
		const dailyOrderVolume = await Order.aggregate([
			{
				// Match orders within the specified date range and not soft-deleted
				$match: {
					orderDate: { $gte: startDate, $lte: endDate },
					isDeleted: false,
				},
			},
			{
				// Group by date and count the number of orders for each day
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$orderDate",
						}, // Format orderDate to YYYY-MM-DD
					},
					count: { $sum: 1 }, // Count each document (order)
				},
			},
			{
				// Sort the results by date in ascending order
				$sort: { _id: 1 },
			},
		]);

		// 3. Calculate Total Order Volume
		let totalOrderVolume = 0;
		dailyOrderVolume.forEach((day) => {
			totalOrderVolume += day.count;
		});

		// 4. Prepare and Send Response
		res.status(200).json({
			success: true,
			message: "Order volume summary fetched successfully.",
			data: {
				dailyVolume: dailyOrderVolume.map((day) => ({
					date: day._id,
					count: day.count,
				})), // Rename _id to date
				overallTotalVolume: totalOrderVolume,
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
