import pool from "../db.js";
import bcrypt from "bcrypt";

const saltRounds = 10;

// Fetch all non-deleted users
export const getAllUsers = async (req, res) => {
	try {
		const result = await pool.query(
			`SELECT
				user_id,
				username,
				user_role,
				user_status,
				phone_number,
				created_at,
				updated_at
			FROM users
			WHERE is_deleted = FALSE
			ORDER BY user_id ASC`
		);
		return res.status(200).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Fetch a single user by ID (only if not deleted)
export const getUserById = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pool.query(
			`SELECT
				user_id,
				username,
				user_role,
				user_status,
				phone_number,
				created_at,
				updated_at
			FROM users
			WHERE user_id = $1 AND is_deleted = FALSE`,
			[id]
		);
		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}
		return res.status(200).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Create a new user (status defaults to 'active')
export const createUser = async (req, res) => {
	try {
		const { username, user_role, phone_number, password } = req.body;
		const salt = await bcrypt.genSalt(saltRounds);
		const password_hash = await bcrypt.hash(password, salt);

		const result = await pool.query(
			`INSERT INTO users (username, user_role, phone_number, password_hash)
				VALUES ($1, $2, $3, $4)
			RETURNING
				user_id,
				username,
				user_role,
				user_status,
				phone_number,
				created_at,
				updated_at`,
			[username, user_role, phone_number || null, password_hash]
		);

		return res.status(201).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Update existing user (optional password change)
export const updateUserByID = async (req, res) => {
	try {
		const { id } = req.params;
		const { username, user_role, phone_number, password, user_status } = req.body;

		let fields = [];
		let values = [];
		let idx = 1;

		if (username) {
			fields.push(`username = $${idx++}`);
			values.push(username);
		}
		if (user_role) {
			fields.push(`user_role = $${idx++}`);
			values.push(user_role);
		}
		if (typeof phone_number !== "undefined") {
			fields.push(`phone_number = $${idx++}`);
			values.push(phone_number || null); // treat empty string as null
		}
		if (user_status) {
			fields.push(`user_status = $${idx++}`);
			values.push(user_status);
		}
		if (password) {
			const salt = await bcrypt.genSalt(saltRounds);
			const password_hash = await bcrypt.hash(password, salt);
			fields.push(`password_hash = $${idx++}`);
			values.push(password_hash);
		}

		if (fields.length === 0) {
			return res.status(400).json({ success: false, message: "No fields to update" });
		}

		values.push(id); // for WHERE clause

		const sql = `
			UPDATE users SET ${fields.join(", ")}
			WHERE user_id = $${idx} AND is_deleted = FALSE
			RETURNING user_id, username, user_role, user_status, phone_number, created_at, updated_at
		`;

		const result = await pool.query(sql, values);

		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: "User not found or deleted" });
		}

		return res.status(200).json({ success: true, data: result.rows[0] });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
};

// Soft-delete a user by setting is_deleted = TRUE
export const deleteUserByID = async (req, res) => {
	try {
		const { id } = req.params;
		const result = await pool.query(
		`UPDATE users
		SET is_deleted = TRUE, user_status = 'suspended'
		WHERE user_id = $1 AND is_deleted = FALSE
       	RETURNING user_id`,
		[id]
		);

		if (result.rows.length === 0) {
			return res
				.status(404)
				.json({ success: false, message: "User not found or already deleted" });
		}

		return res.status(204).send();
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
