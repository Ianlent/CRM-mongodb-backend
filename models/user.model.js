import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			maxlength: 50,
		},
		userRole: {
			type: String,
			required: true,
			enum: ["employee", "manager", "admin"], // Enforces enum values
		},
		userStatus: {
			type: String,
			required: true,
			enum: ["active", "suspended"], // Enforces enum values
			default: "active",
		},
		phoneNumber: {
			type: String,
			trim: true,
			maxlength: 20,
		},
		passwordHash: {
			// Store the hashed password here
			type: String,
			required: true,
			maxlength: 100, // Adjust max length based on hashing algorithm output (e.g., bcrypt is often longer)
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.model("User", userSchema);
