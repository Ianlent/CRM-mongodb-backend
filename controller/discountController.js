import Discount from "../models/discount.model.js"; // Import the Mongoose Discount model

export const getAllDiscounts = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		// Find all non-deleted discounts with pagination
		const discounts = await Discount.find({ isDeleted: false })
			.sort({ createdAt: -1 }) // Sort by createdAt descending
			.skip(skip)
			.limit(limit)
			.select("requiredPoints discountType amount createdAt updatedAt"); // Select specific fields

		// Get total count for pagination
		const totalCount = await Discount.countDocuments({ isDeleted: false });

		return res.status(200).json({
			success: true,
			data: discounts,
			pagination: {
				total_record: totalCount,
				page: page,
				limit: limit,
				total_pages: Math.ceil(totalCount / limit), // Add total_pages for convenience
			},
		});
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getDiscountById = async (req, res) => {
	try {
		const { id } = req.params;

		// Find a single discount by its _id
		const discount = await Discount.findOne({
			_id: id,
			isDeleted: false,
		}).select("requiredPoints discountType amount createdAt updatedAt");

		if (!discount) {
			// Mongoose returns null if no document is found
			return res
				.status(404)
				.json({ success: false, message: "Discount not found" });
		}

		// Mongoose returns the document directly
		return res.status(200).json({ success: true, data: discount });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const createDiscount = async (req, res) => {
	try {
		const { requiredPoints, discountType, amount } = req.body; // Use camelCase

		// Create a new Discount document
		const newDiscount = new Discount({
			requiredPoints,
			discountType,
			amount,
			// isDeleted defaults to false as per schema
		});

		// Save the document to MongoDB
		const savedDiscount = await newDiscount.save();

		// Mongoose returns the saved document, convert to plain object for response
		const responseData = savedDiscount.toObject();
		delete responseData.isDeleted; // Optionally remove isDeleted from response

		return res.status(201).json({ success: true, data: responseData });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const updateDiscountById = async (req, res) => {
	try {
		const { id } = req.params;
		const { requiredPoints, discountType, amount } = req.body; // Use camelCase

		// Build the update object dynamically
		const updateFields = {};
		if (requiredPoints !== undefined)
			updateFields.requiredPoints = requiredPoints;
		if (discountType !== undefined)
			updateFields.discountType = discountType;
		if (amount !== undefined) updateFields.amount = amount;

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		// Find the discount by _id and update it.
		const updatedDiscount = await Discount.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query
			{ $set: updateFields }, // Update operation using $set
			{ new: true, runValidators: true } // Options
		).select("requiredPoints discountType amount createdAt updatedAt");

		if (!updatedDiscount) {
			return res.status(404).json({
				success: false,
				message: "Discount not found or deleted",
			});
		}

		return res.status(200).json({ success: true, data: updatedDiscount });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// Soft delete a discount by ID
export const deleteDiscountById = async (req, res) => {
	try {
		const { id } = req.params;

		// Perform a soft delete by updating isDeleted to true
		const deletedDiscount = await Discount.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query: find by ID and ensure it's not already deleted
			{ $set: { isDeleted: true } }, // Update: set isDeleted to true
			{ new: true } // Return the updated document
		).select("_id"); // Only return the ID to confirm it was found

		if (!deletedDiscount) {
			return res.status(404).json({
				success: false,
				message: "Discount not found or already deleted",
			});
		}

		return res.status(204).send(); // 204 No Content for successful soft delete
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
