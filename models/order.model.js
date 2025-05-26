import mongoose from "mongoose";

// Define a sub-schema for services within an order
const orderServiceSubSchema = new mongoose.Schema(
	{
		serviceId: {
			// Reference to the actual Service document
			type: mongoose.Schema.Types.ObjectId,
			ref: "Service",
			required: true,
		},
		serviceName: {
			// Embedded for quick access (denormalized)
			type: String,
			required: true,
		},
		serviceUnit: {
			// Embedded for quick access
			type: String,
			required: true,
		},
		pricePerUnit: {
			// Embedded for quick access (price at the time of order)
			type: Number,
			required: true,
			min: 1,
		},
		numberOfUnit: {
			type: Number,
			required: true,
			min: 1,
		},
		totalPrice: {
			// Computed value, can be pre-calculated or calculated in app
			type: Number,
			required: true,
			min: 1,
		},
	},
	{ _id: false }
); // Do not generate an _id for this sub-document

// Define a sub-schema for embedded customer info
const customerInfoSubSchema = new mongoose.Schema(
	{
		firstName: { type: String, required: true },
		lastName: { type: String, required: true },
		phoneNumber: String,
	},
	{ _id: false }
);

// Define a sub-schema for embedded handler info
const handlerInfoSubSchema = new mongoose.Schema(
	{
		username: { type: String, required: true },
		userRole: {
			type: String,
			enum: ["employee", "manager", "admin"],
			required: true,
		},
	},
	{ _id: false }
);

// Define a sub-schema for embedded discount info
const discountInfoSubSchema = new mongoose.Schema(
	{
		discountType: {
			type: String,
			enum: ["percent", "fixed"],
			required: true,
		},
		amount: { type: Number, required: true, min: 1 },
	},
	{ _id: false }
);

const orderSchema = new mongoose.Schema(
	{
		customerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Customer", // Reference to the Customer model
			required: true,
		},
		customerInfo: {
			// Embedded customer details
			type: customerInfoSubSchema,
			required: true,
		},
		orderDate: {
			type: Date,
			default: Date.now,
		},
		handlerId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User", // Reference to the User model (can be null if handler is optional)
		},
		handlerInfo: {
			// Embedded handler details
			type: handlerInfoSubSchema,
			// Not required, as handlerId can be null
		},
		orderStatus: {
			type: String,
			required: true,
			enum: ["pending", "confirmed", "completed", "cancelled"], // Enforces enum values
			default: "pending",
		},
		discountId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Discount", // Reference to the Discount model (can be null)
		},
		discountInfo: {
			// Embedded discount details
			type: discountInfoSubSchema,
			// Not required, as discountId can be null
		},
		services: {
			// Array of embedded order-specific service details
			type: [orderServiceSubSchema],
			default: [],
		},
		isDeleted: {
			type: Boolean,
			default: false,
		},
	},
	{
		timestamps: true, // Adds createdAt and updatedAt automatically
	}
);

// Index for order date queries
orderSchema.index({ orderDate: -1 });

export default mongoose.model("Order", orderSchema);
