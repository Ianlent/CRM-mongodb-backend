import jwt from "jsonwebtoken";
import dotenv from "dotenv"; // Import dotenv if not already configured globally for this file
dotenv.config(); // Ensure JWT_SECRET is loaded

export const generateToken = (user) => {
	// Assuming 'user' object passed here will have _id, username, userRole, userStatus
	const payload = {
		_id: user._id, // Use _id as per MongoDB convention
		username: user.username,
		userRole: user.userRole, // Use userRole (camelCase)
		userStatus: user.userStatus, // Use userStatus (camelCase)
	};
	return jwt.sign(payload, process.env.JWT_SECRET, {
		algorithm: "HS256",
		expiresIn: "1h",
	});
};
