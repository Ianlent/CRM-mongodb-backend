import bcrypt from "bcrypt";
import User from "../models/user.model.js"; // Import the Mongoose User model

const saltRounds = 10;

// Fetch all non-deleted users
export const getAllUsers = async (req, res) => {
	const { page = 1, limit = 10, search } = req.query; // Destructure 'search' from req.query
	const parsedPage = parseInt(page); // Parse page to number
	const parsedLimit = parseInt(limit); // Parse limit to number

	const skip = (parsedPage - 1) * parsedLimit;

	try {
		let query = { isDeleted: false }; // Base query to exclude deleted users

		// If a search term is provided, add it to the query
		if (search) {
			// Use Mongoose's $regex for case-insensitive partial matching on username
			// $options: 'i' makes the search case-insensitive
			query.username = { $regex: search, $options: "i" };
		}

		const users = await User.find(query) // Apply the constructed query
			.sort({ _id: 1 }) // Sort by _id ascending
			.skip(skip)
			.limit(parsedLimit) // Use parsedLimit here
			.select(
				"username userRole userStatus phoneNumber createdAt updatedAt"
			); // Select specific fields

		// Count total documents matching the search query (if any)
		const totalCount = await User.countDocuments(query);

		return res.status(200).json({
			success: true,
			data: users,
			pagination: {
				total_records: totalCount,
				page: parsedPage,
				limit: parsedLimit,
				total_pages: Math.ceil(totalCount / parsedLimit),
			},
		});
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getUserById = async (req, res) => {
	try {
		const { id } = req.params;

		const user = await User.findOne({ _id: id, isDeleted: false }).select(
			"username userRole userStatus phoneNumber createdAt updatedAt"
		);

		if (!user) {
			return res
				.status(404)
				.json({ success: false, message: "User not found" });
		}

		return res.status(200).json({ success: true, data: user });
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
		const { username, userRole, phoneNumber, password } = req.body; // Use camelCase

		// Hash password
		const salt = await bcrypt.genSalt(saltRounds);
		const passwordHash = await bcrypt.hash(password, salt); // Store the hashed password

		// Create a new User document
		const newUser = new User({
			username,
			userRole, // Use userRole as per Mongoose schema
			phoneNumber: phoneNumber || null, // Mongoose handles null if not provided
			passwordHash,
			// userStatus defaults to 'active' as per schema
			// isDeleted defaults to 'false' as per schema
		});

		// Save the document to MongoDB
		const savedUser = await newUser.save();

		// Mongoose returns the saved document, convert to plain object for response
		const responseData = savedUser.toObject();
		delete responseData.passwordHash; // Remove passwordHash before sending
		delete responseData.isDeleted; // Optionally remove isDeleted
		// createdAt and updatedAt are often kept for new user responses

		return res.status(201).json({ success: true, data: responseData });
	} catch (err) {
		// Handle potential duplicate username error specifically
		if (err.code === 11000 && err.keyPattern && err.keyPattern.username) {
			return res
				.status(409)
				.json({ success: false, message: "Username already exists" });
		}
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Update existing user (optional password change)
export const updateUserByID = async (req, res) => {
	const currentUserRole = req.user?.userRole;
	const userId = req.user?._id;
	try {
		const { id } = req.params;
		const { username, userRole, phoneNumber, password, userStatus } =
			req.body; // Use camelCase

		if (currentUserRole !== "admin" && userId !== id) {
			return res
				.status(403)
				.json({ success: false, message: "Forbidden" });
		}
		// Build the update object dynamically
		const updateFields = {};
		if (username !== undefined) updateFields.username = username;
		if (userRole !== undefined) updateFields.userRole = userRole;
		if (phoneNumber !== undefined)
			updateFields.phoneNumber = phoneNumber || null; // Handle explicit null or empty string
		if (userStatus !== undefined) updateFields.userStatus = userStatus;

		if (password) {
			// If password is provided, hash it before updating
			const salt = await bcrypt.genSalt(saltRounds);
			const passwordHash = await bcrypt.hash(password, salt);
			updateFields.passwordHash = passwordHash;
		}

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		// Find the user by _id and update it.
		// { new: true } returns the updated document.
		// { runValidators: true } runs schema validators on the update operation.
		// { context: 'query' } ensures unique validator works correctly on update
		const updatedUser = await User.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query
			{ $set: updateFields }, // Update operation using $set
			{ new: true, runValidators: true, context: "query" } // Options
		).select(
			"username userRole userStatus phoneNumber createdAt updatedAt"
		);

		if (!updatedUser) {
			return res
				.status(404)
				.json({ success: false, message: "User not found or deleted" });
		}

		return res.status(200).json({ success: true, data: updatedUser });
	} catch (err) {
		// Handle potential duplicate username error specifically on update
		if (err.code === 11000 && err.keyPattern && err.keyPattern.username) {
			return res
				.status(409)
				.json({ success: false, message: "Username already exists" });
		}
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Soft-delete a user by setting is_deleted = TRUE and user_status = 'suspended'
export const deleteUserByID = async (req, res) => {
	try {
		const { id } = req.params;

		// Perform a soft delete by updating isDeleted to true and userStatus to 'suspended'
		const deletedUser = await User.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query: find by ID and ensure it's not already deleted
			{ $set: { isDeleted: true, userStatus: "suspended" } }, // Update: set both fields
			{ new: true } // Return the updated document
		).select("_id"); // Only return the ID to confirm it was found

		if (!deletedUser) {
			return res.status(404).json({
				success: false,
				message: "User not found or already deleted",
			});
		}

		return res.status(204).send(); // 204 No Content for successful deletion
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
