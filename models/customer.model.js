import mongoose from "mongoose";

const customerSchema = new mongoose.Schema(
	{
		// MongoDB automatically generates _id as ObjectId
		firstName: {
			type: String,
			required: true,
			trim: true, // Remove whitespace from both ends of a string
			maxlength: 50,
		},
		lastName: {
			type: String,
			required: true,
			trim: true,
			maxlength: 50,
		},
		phoneNumber: {
			type: String,
			trim: true,
			maxlength: 20,
			// Consider adding regex validation for phone number format
		},
		address: {
			type: String,
			required: true,
			trim: true,
			maxlength: 100,
		},
		points: {
			type: Number,
			default: 0,
			min: 0,
		},
		// Soft delete flag
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true, // Adds createdAt and updatedAt fields automatically
	}
);

// Index for search on multiple fields (case-insensitive approximation)
customerSchema.index(
	{
		isDeleted: 1,
		phoneNumber: 1, // Ascending order
		firstName: 1,
		lastName: 1,
	},
	{
		collation: { locale: "en", strength: 2 }, // strength:2 for case-insensitive, diacritic-sensitive comparison
	}
);
customerSchema.index(
	{ isDeleted: 1, firstName: 1 },
	{ collation: { locale: "en", strength: 2 } }
);
customerSchema.index(
	{ isDeleted: 1, lastName: 1 },
	{ collation: { locale: "en", strength: 2 } }
);

export default mongoose.model("Customer", customerSchema);
