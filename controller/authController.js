import bcrypt from "bcrypt";
import { generateToken } from "../utils/generateToken.js";
import User from "../models/user.model.js"; // Import the Mongoose User model

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
			_id: user._id, // Correctly uses _id
			username: user.username,
			userRole: user.userRole, // Correctly uses userRole
			// Missing userStatus here, but it's passed to generateToken
		};

		// Generate JWT
		const token = generateToken(userForToken); // This will pass the userForToken

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
