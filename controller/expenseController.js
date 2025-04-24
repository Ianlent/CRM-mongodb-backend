import pool from "../db.js";

export const getAllExpenses = async (req, res) => {
	try {
		const { page = 1, limit = 10 } = req.query;
		const offset = (page - 1) * limit;
		const result = await pool.query(`SELECT 
				expense_id,
				amount,
				expense_date,
				expense_description 
			FROM expenses
			WHERE is_deleted = FALSE
			ORDER BY expense_date DESC
			LIMIT $1 OFFSET $2;`, [limit, offset]);
		
		const countResult = await pool.query(
			`SELECT COUNT(*) FROM expenses WHERE is_deleted = FALSE;`
		)
		const totalCount = parseInt(countResult.rows[0].count);
		return res.status(200).json({
			success: true,
			data: result.rows,
			pagination: {
				total_record: totalCount,
				page: parseInt(page),
				limit: parseInt(limit),
			}
		});
	} catch (err) {
		console.error(err.message);
		return res
		.status(500)
		.json({ success: false, message: "Internal Server Error" });
	}
};

export const getExpensesByDateRange = async (req, res) => {
	const { start, end } = req.query;
	
	if (!start && !end) {
		return res.status(400).json({ success: false, message: "Start or end date is required." });
	}

	let startDate = start ? new Date(start) : null;
	let endDate = end ? new Date(end) : null;

	if (startDate > endDate) {
		return res.status(400).json({ success: false, message: "Start date cannot be after end date." });
	}

	if ((startDate && isNaN(startDate)) || (endDate && isNaN(endDate))) {
		return res.status(400).json({ success: false, message: "Invalid date format." });
	}

	if (startDate && !endDate) {
		endDate = new Date(); //today
	}

	if (!startDate && endDate) {
		startDate = new Date("1970-01-01"); //early date
	}

	startDate.setHours(0, 0, 0, 0);
	endDate.setHours(23, 59, 59, 999);

	try {
		const result = await pool.query(
			`SELECT expense_id, amount, expense_date, expense_description
			FROM expenses
			WHERE is_deleted = FALSE
			AND expense_date BETWEEN $1 AND $2
			ORDER BY expense_date DESC`,
			[startDate, endDate]
		);

		return res.status(200).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

export const getExpenseById = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pool.query(
			`SELECT 
				expense_id, amount, expense_date, expense_description
			FROM expenses
			WHERE expense_id = $1 AND is_deleted = FALSE`, [id]);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: "Expense not found" });
		}

		return res.status(200).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error(err.message);
		return res
		.status(500)
		.json({ success: false, message: "Internal Server Error" });
	}
};

export const createExpense = async (req, res) => {
	try {
		const { amount, expense_description } = req.body;
		const result = await pool.query(
		`INSERT INTO expenses (amount, expense_description)
		VALUES ($1, $2)
		RETURNING 
			expense_id, amount, expense_date, expense_description`,
		[amount, expense_description]
		);
		return res.status(201).json({ success: true, data: result.rows[0] });
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
		const { amount, expense_date, expense_description } = req.body;
		let fields = [];
		let values = [];
		let idx = 1;

		if (amount) {
			fields.push(`amount = $${idx++}`);
			values.push(amount);
		}
		if (expense_date) {
			fields.push(`expense_date = $${idx++}`);
			values.push(expense_date);
		}
		if (expense_description) {
			fields.push(`expense_description = $${idx++}`);
			values.push(expense_description);
		}

		if (fields.length === 0) {
			return res.status(400).json({ success: false, message: "No fields to update" });
		}

		values.push(id);

		const sql = `
		UPDATE expenses SET ${fields.join(", ")}
		WHERE expense_id = $${idx} AND is_deleted = FALSE
		RETURNING expense_id, amount, expense_date, expense_description
		`;

		const result = await pool.query(sql, values);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: "Expense not found or deleted" });
		}

		return res.status(200).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

export const deleteExpenseByID = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pool.query(
			`UPDATE expenses
			SET is_deleted = TRUE 
			WHERE expense_id = $1`,
			[id]);

		if (result.rowCount === 0) {
			return res.status(404).json({ success: false, message: "Expense not found" });
		}

		return res.status(200).json({ success: true, message: "Expense deleted successfully" });
	} catch (err) {
		console.error(err.message);
		return res
		.status(500)
		.json({ success: false, message: "Internal Server Error" });
	}
};