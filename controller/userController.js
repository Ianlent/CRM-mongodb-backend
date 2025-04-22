import pool from "../db.js";
import bcrypt from "bcrypt";

const saltRound = 10;
/**
 * @description Get all users in the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing an array of users
 * @throws {Error} If there is an error with the database query
 */
export const getAllUsers = async (req, res) => {
	try {
		const result = await pool.query("SELECT * FROM users ORDER BY user_id ASC");
		return res.status(200).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	};
}

/**
 * @description Get a user by id in the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing the user with the given id
 * @throws {Error} If there is an error with the database query
 */
export const getUserById = async (req, res) => {
	try {
		const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [req.params.id]);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: "User not found" });
		}
		return res.status(200).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	};
}

/**
 * @description Create a new user in the database
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing the newly created user
 * @throws {Error} If there is an error with the database query
 */
export const createUser = async (req, res) => {
	try {
		const { username, user_role, phone_number, password } = req.body;

		const salt = bcrypt.genSaltSync(saltRound);
		const password_hash = bcrypt.hashSync(password, salt);

		const result = await pool.query("INSERT INTO users (username, user_role, phone_number, password_hash) VALUES ($1, $2, $3, $4) RETURNING *", [username, user_role, phone_number, password_hash]);
		return res.status(201).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	};
}

/**
 * @description Update a user in the database by id
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} JSON response containing the updated user
 * @throws {Error} If there is an error with the database query
 */
export const updateUserByID = async (req, res) => {
	try {
		const { username, user_role, phone_number, password } = req.body;
		let password_hash;
		if (password) {
			const salt = bcrypt.genSaltSync(saltRound);
			password_hash = bcrypt.hashSync(password, salt);
		}

		const result = password ? await pool.query(
			"UPDATE users SET username = $1, user_role = $2, phone_number = $3, password_hash = $4 WHERE user_id = $5 RETURNING *",
			[username, user_role, phone_number, password_hash, req.params.id]
		) : await pool.query(
			"UPDATE users SET username = $1, user_role = $2, phone_number = $3 WHERE user_id = $4 RETURNING *",
			[username, user_role, phone_number, req.params.id]
		);
		if (result.rows.length === 0) {
			return res.status(404).json({ success: false, message: "User not found" });
		}
		return res.status(200).json({ success: true, data: result.rows });
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	}
}

/**
 * @description Delete a user from the database by id
 * @param {Object} req - Express request object
 * @param {string} req.params.id - ID of the user to delete
 * @param {Object} res - Express response object
 * @returns {Object} JSON response with status code 204 if successful, 404 if user not found, or 500 on error
 * @throws {Error} If there is an error with the database query
 */

export const deleteUserByID = async (req, res) => {
	try {
		const result = await pool.query("DELETE FROM users WHERE user_id = $1 RETURNING *", [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
		return res.status(204).send();
	} catch (err) {
		console.error(err.message);
		return res.status(500).json({ success: false, message: "Internal Server Error" });
	};
}