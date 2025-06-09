import Order from "../../models/order.model.js";
import Expense from "../../models/expense.model.js";

export const getFinancialSummary = async (req, res) => {
	try {
		const { start, end } = req.query;

		// Input validation for dates
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

		// Aggregate daily revenue (without detailed orders)
		const dailyRevenue = await Order.aggregate([
			{
				$match: {
					orderStatus: "completed",
					completedOn: { $gte: startDate, $lte: endDate },
					isDeleted: false,
				},
			},
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
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$completedOn",
						},
					},
					totalRevenue: { $sum: "$orderNetTotal" },
					// Removed $push for orders here
				},
			},
			{
				$sort: { _id: 1 },
			},
		]);

		// Aggregate daily expenses (without detailed expenses)
		const dailyExpenses = await Expense.aggregate([
			{
				$match: {
					expenseDate: { $gte: startDate, $lte: endDate },
					isDeleted: false,
				},
			},
			{
				$group: {
					_id: {
						$dateToString: {
							format: "%Y-%m-%d",
							date: "$expenseDate",
						},
					},
					totalExpenses: { $sum: "$amount" },
					// Removed $push for expenses here
				},
			},
			{
				$sort: { _id: 1 },
			},
		]);

		// Combine results and calculate profit/profit margin
		const financialSummary = {};
		let overallTotalRevenue = 0;
		let overallTotalExpenses = 0;

		dailyRevenue.forEach((rev) => {
			financialSummary[rev._id] = {
				date: rev._id,
				revenue: rev.totalRevenue,
				expenses: 0, // Initialize expenses to 0
				profit: 0,
				profitMargin: 0,
			};
			overallTotalRevenue += rev.totalRevenue;
		});

		dailyExpenses.forEach((exp) => {
			if (!financialSummary[exp._id]) {
				financialSummary[exp._id] = {
					date: exp._id,
					revenue: 0, // Initialize revenue to 0
					expenses: exp.totalExpenses,
					profit: 0,
					profitMargin: 0,
				};
			} else {
				financialSummary[exp._id].expenses = exp.totalExpenses;
			}
			overallTotalExpenses += exp.totalExpenses;
		});

		// Calculate profit and profit margin for each day
		Object.values(financialSummary).forEach((day) => {
			day.profit = day.revenue - day.expenses;
			day.profitMargin =
				day.revenue > 0 ? (day.profit / day.revenue) * 100 : 0;
		});

		// Convert to array and sort by date
		const dailyResults = Object.values(financialSummary).sort(
			(a, b) => new Date(a.date) - new Date(b.date)
		);

		// Calculate overall totals
		const overallTotalProfit = overallTotalRevenue - overallTotalExpenses;
		const overallTotalProfitMargin =
			overallTotalRevenue > 0
				? (overallTotalProfit / overallTotalRevenue) * 100
				: 0;

		res.status(200).json({
			success: true,
			message: "Financial summary fetched successfully",
			data: {
				dailySummary: dailyResults, // This array now only contains summary fields
				overallTotals: {
					totalRevenue: overallTotalRevenue,
					totalExpenses: overallTotalExpenses,
					totalProfit: overallTotalProfit,
					totalProfitMargin: overallTotalProfitMargin,
				},
			},
		});
	} catch (error) {
		console.error("Error fetching financial summary:", error);
		res.status(500).json({
			success: false,
			message: "Server error",
			error: error.message,
		});
	}
};
