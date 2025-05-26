import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const MONGO_URI =
	process.env.MODE === "production"
		? process.env.MONGO_URI_PROD
		: process.env.MONGO_URI_DEV;
export const connectDB = async () => {
	try {
		const conn = await mongoose.connect(MONGO_URI);
		console.log(`MongoDB Connected: ${conn.connection.host}`);
	} catch (error) {
		console.log(`Error: ${error.message}`);
		process.exit(1);
	}
};
