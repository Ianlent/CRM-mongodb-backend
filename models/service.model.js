import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
	{
		serviceName: {
			type: String,
			required: true,
			trim: true,
			maxlength: 30,
		},
		serviceUnit: {
			type: String,
			required: true,
			trim: true,
			maxlength: 20,
		},
		servicePricePerUnit: {
			type: Number,
			required: true,
			min: 1, // Price must be greater than 0
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

// Text index for partial matching (similar to pg_trgm)
serviceSchema.index({ serviceName: "text" });

export default mongoose.model("Service", serviceSchema);
