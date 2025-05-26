import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";
import User from "../models/user.model.js"; // Import the Mongoose User model

const saltRounds = 10;

// Register a new employee user
export const register = async (req, res) => {
	try {
		const { username, phone_number, password } = req.body;

		// Check if username already taken (including deleted accounts)
		// Mongoose findOne directly checks existence
		const existingUser = await User.findOne({ username: username });
		if (existingUser) {
			return res
				.status(409)
				.json({ success: false, message: "Username already exists" });
		}

		const userRole = "employee"; // Renamed to userRole for consistency with Mongoose model

		// Hash password
		const salt = await bcrypt.genSalt(saltRounds);
		const passwordHash = await bcrypt.hash(password, salt); // Renamed to passwordHash

		// Create and insert user using Mongoose model
		const newUser = new User({
			username,
			userRole, // Use userRole as per Mongoose schema
			phoneNumber: phone_number, // Map phone_number to phoneNumber
			passwordHash,
			// userStatus defaults to 'active' as per schema
			// isDeleted defaults to 'false' as per schema
		});

		const savedUser = await newUser.save();

		// Prepare user object for token (excluding passwordHash)
		const userForToken = {
			_id: savedUser._id, // Use MongoDB's _id
			username: savedUser.username,
			userRole: savedUser.userRole,
		};

		// Generate JWT
		const token = generateToken(userForToken);

		// Return a clean user object (without passwordHash)
		const responseUser = savedUser.toObject(); // Convert Mongoose document to plain JS object
		delete responseUser.passwordHash; // Remove passwordHash before sending
		delete responseUser.isDeleted; // Optionally remove isDeleted if not relevant for response
		delete responseUser.createdAt; // Optionally remove audit fields if not relevant for response
		delete responseUser.updatedAt; // Optionally remove audit fields if not relevant for response

		return res
			.status(201)
			.json({ success: true, user: responseUser, token });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Authenticate and login user
export const login = async (req, res) => {
	try {
		const { username, password } = req.body;

		// Fetch user with active status and not deleted
		const user = await User.findOne({
			username: username,
			isDeleted: false,
			userStatus: "active",
		});

		if (!user) {
			return res
				.status(401)
				.json({ success: false, message: "Invalid credentials" });
		}

		// Compare password
		const match = await bcrypt.compare(password, user.passwordHash); // Use user.passwordHash
		if (!match) {
			return res
				.status(401)
				.json({ success: false, message: "Invalid credentials" });
		}

		// Prepare user object for token (excluding passwordHash)
		const userForToken = {
			_id: user._id, // Use MongoDB's _id
			username: user.username,
			userRole: user.userRole,
		};

		// Generate JWT
		const token = generateToken(userForToken);

		// Return a clean user object (without passwordHash)
		const responseUser = user.toObject(); // Convert Mongoose document to plain JS object
		delete responseUser.passwordHash; // Remove passwordHash before sending
		delete responseUser.isDeleted; // Optionally remove isDeleted
		delete responseUser.createdAt; // Optionally remove audit fields
		delete responseUser.updatedAt; // Optionally remove audit fields

		return res
			.status(200)
			.json({ success: true, user: responseUser, token });
	} catch (err) {
		console.error(err);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
