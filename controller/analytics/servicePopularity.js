import Order from "../../models/order.model.js";

export const getServicePopularity = async (req, res) => {
	// Get the type of popularity from query parameters (e.g., /api/analytics/service-popularity?type=revenue&start=2025-05-01&end=2025-05-31)
	const { type, start, end } = req.query;

	// Validate the 'type' parameter
	if (!type || (type !== "revenue" && type !== "quantity")) {
		return res.status(400).json({
			message:
				"Invalid or missing 'type' parameter. Please specify 'revenue' or 'quantity'.",
		});
	}

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

	// Prevent end date from being in the future relative to the current date
	const currentDate = new Date();
	currentDate.setHours(23, 59, 59, 999); // Set to end of current day for comparison

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

	try {
		let pipeline = [];
		let sumField = ""; // The field to sum based on type
		let metricName = ""; // The name for the summed field in the output

		// Step 0: Add a $match stage for date range filtering
		pipeline.push({
			$match: {
				orderDate: {
					$gte: startDate,
					$lte: endDate,
				},
			},
		});

		// Step 1: Unwind the 'services' array
		// This creates a separate document for each item in the 'services' array within an order.
		pipeline.push({
			$unwind: "$services",
		});

		// Determine which field to sum based on the 'type' parameter
		if (type === "revenue") {
			sumField = "$services.totalPrice";
			metricName = "totalRevenue";
		} else {
			// type === 'quantity'
			sumField = "$services.numberOfUnit";
			metricName = "totalQuantity";
		}

		// Step 2: Group by 'serviceName' and sum the chosen metric
		// This calculates the total revenue or total quantity for each unique service.
		pipeline.push({
			$group: {
				_id: "$services.serviceName", // Group by the name of the service
				[metricName]: { $sum: sumField }, // Sum the total price or number of units
			},
		});

		// Step 3: Sort the results in descending order of the calculated metric
		// This puts the most popular/highest revenue services at the top.
		pipeline.push({
			$sort: { [metricName]: -1 },
		});

		// Step 4 (Optional): Project to rename '_id' to 'serviceName' and include the metric
		// This makes the output cleaner and more readable.
		pipeline.push({
			$project: {
				_id: 0, // Exclude the default MongoDB _id field
				serviceName: "$_id", // Rename _id to serviceName
				[metricName]: 1, // Include the calculated metric
			},
		});

		// Execute the aggregation pipeline
		const result = await Order.aggregate(pipeline);

		// Send the successful response
		res.status(200).json({
			type: type,
			data: result,
		});
	} catch (error) {
		console.error(
			`Error calculating service popularity by ${type}:`,
			error
		);
		res.status(500).json({
			message: `Failed to calculate service popularity by ${type}.`,
			error: error.message,
		});
	}
};
