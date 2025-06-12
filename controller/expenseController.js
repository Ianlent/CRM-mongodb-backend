import Expense from "../models/expense.model.js"; // Import the Mongoose Expense model

export const getDailyExpenseDetailsForAnalytics = async (req, res) => {
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

		const result = await Expense.aggregate([
			{
				$match: {
					expenseDate: { $gte: startDate, $lte: endDate },
					isDeleted: false,
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
										date: "$expenseDate",
									},
								},
								expenses: {
									$push: {
										_id: "$_id",
										expenseDescription:
											"$expenseDescription",
										amount: "$amount",
									},
								},
								dailyExpenses: { $sum: "$amount" },
							},
						},
						{
							$project: {
								_id: 0,
								date: "$_id",
								totalExpenses: "$dailyExpenses",
								expenses: 1,
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
										date: "$expenseDate",
									},
								},
							},
						},
						{ $count: "count" },
					],
				},
			},
		]);

		const dailyExpenseDetails = result[0].paginatedResults;
		const totalCount = result[0].totalCount[0]?.count || 0;

		res.status(200).json({
			success: true,
			message: "Daily expense details fetched successfully",
			data: dailyExpenseDetails,
			totalCount: totalCount,
			currentPage: pageNumber,
			pageSize: limitNumber,
			totalPages: Math.ceil(totalCount / limitNumber),
		});
	} catch (error) {
		console.error("Error fetching daily expense details:", error);
		res.status(500).json({
			success: false,
			message: "Server error",
			error: error.message,
		});
	}
};
export const createExpense = async (req, res) => {
	try {
		const { amount, expenseDescription, expenseDate } = req.body; // Use camelCase

		// Create a new Expense document
		const newExpense = new Expense({
			amount,
			expenseDescription: expenseDescription || null,
			expenseDate: expenseDate,
		});

		// Save the document to MongoDB
		const savedExpense = await newExpense.save();

		// Mongoose returns the saved document, convert to plain object for response
		const responseData = savedExpense.toObject();
		delete responseData.isDeleted; // Optionally remove isDeleted from response

		return res.status(201).json({ success: true, data: responseData });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const updateExpenseByID = async (req, res) => {
	try {
		const { id } = req.params;
		const { amount, expenseDate, expenseDescription } = req.body; // Use camelCase

		// Build the update object dynamically
		const updateFields = {};
		if (amount !== undefined) updateFields.amount = amount;
		if (expenseDate !== undefined) updateFields.expenseDate = expenseDate;
		if (expenseDescription !== undefined)
			updateFields.expenseDescription = expenseDescription || null; // Handle explicit null or empty string

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		// Find the expense by _id and update it.
		const updatedExpense = await Expense.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query
			{ $set: updateFields }, // Update operation using $set
			{ new: true, runValidators: true } // Options
		).select("amount expenseDate expenseDescription");

		if (!updatedExpense) {
			return res.status(404).json({
				success: false,
				message: "Expense not found or deleted",
			});
		}

		return res.status(200).json({ success: true, data: updatedExpense });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const deleteExpenseByID = async (req, res) => {
	try {
		const { id } = req.params;

		// Perform a soft delete by updating isDeleted to true
		const deletedExpense = await Expense.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query: find by ID and ensure it's not already deleted
			{ $set: { isDeleted: true } }, // Update: set isDeleted to true
			{ new: true } // Return the updated document
		).select("_id"); // Only return the ID to confirm it was found

		if (!deletedExpense) {
			return res.status(404).json({
				success: false,
				message: "Expense not found or already deleted",
			});
		}

		return res.status(204).send(); // 204 No Content for successful soft delete
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
