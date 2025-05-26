import Expense from "../models/expense.model.js"; // Import the Mongoose Expense model

export const getAllExpenses = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		// Find all non-deleted expenses with pagination
		const expenses = await Expense.find({ isDeleted: false })
			.sort({ expenseDate: -1 }) // Sort by expenseDate descending
			.skip(skip)
			.limit(limit)
			.select("amount expenseDate expenseDescription"); // Select specific fields

		// Get total count for pagination
		const totalCount = await Expense.countDocuments({ isDeleted: false });

		return res.status(200).json({
			success: true,
			data: expenses,
			pagination: {
				total_record: totalCount,
				page: page,
				limit: limit,
				total_pages: Math.ceil(totalCount / limit), // Add total_pages for convenience
			},
		});
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getExpensesByDateRange = async (req, res) => {
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

	const query = {
		isDeleted: false,
		expenseDate: {
			// Use Mongoose's date range query operators
			...(startDate && { $gte: startDate }), // Greater than or equal to start date
			...(endDate && { $lte: endDate }), // Less than or equal to end date
		},
	};

	try {
		const expenses = await Expense.find(query)
			.sort({ expenseDate: -1 })
			.select("amount expenseDate expenseDescription");

		return res.status(200).json({ success: true, data: expenses });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getExpenseById = async (req, res) => {
	try {
		const { id } = req.params;

		// Find a single expense by its _id
		const expense = await Expense.findOne({
			_id: id,
			isDeleted: false,
		}).select("amount expenseDate expenseDescription");

		if (!expense) {
			// Mongoose returns null if no document is found
			return res
				.status(404)
				.json({ success: false, message: "Expense not found" });
		}

		// Mongoose returns the document directly
		return res.status(200).json({ success: true, data: expense });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const createExpense = async (req, res) => {
	try {
		const { amount, expenseDescription } = req.body; // Use camelCase

		// Create a new Expense document
		const newExpense = new Expense({
			amount,
			expenseDescription: expenseDescription || null, // Mongoose handles null if not provided
			// expenseDate defaults to now() as per schema
			// isDeleted defaults to false as per schema
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
