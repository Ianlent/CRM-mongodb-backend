import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
	{
		amount: {
			type: Number,
			required: true,
			min: 1, // Amount must be greater than 0
		},
		expenseDate: {
			type: Date,
			default: Date.now,
		},
		expenseDescription: {
			type: String,
			trim: true,
			maxlength: 50,
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

// Index for expense date queries
expenseSchema.index({ expenseDate: -1 });

export default mongoose.model("Expense", expenseSchema);
