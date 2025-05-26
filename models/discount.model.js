import mongoose from "mongoose";

const discountSchema = new mongoose.Schema(
	{
		requiredPoints: {
			type: Number,
			required: true,
			min: 0,
		},
		discountType: {
			type: String,
			required: true,
			enum: ["percent", "fixed"], // Enforces enum values
		},
		amount: {
			type: Number,
			required: true,
			min: 1, // Amount must be greater than 0
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

export default mongoose.model("Discount", discountSchema);
