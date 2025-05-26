import Service from "../models/service.model.js"; // Import the Mongoose Service model

// GET all services with optional pagination
export const getAllServices = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1;
		const limit = parseInt(req.query.limit) || 10;
		const skip = (page - 1) * limit;

		// Find all non-deleted services with pagination
		const services = await Service.find({ isDeleted: false })
			.sort({ _id: 1 }) // Sort by _id ascending
			.skip(skip)
			.limit(limit)
			.select("serviceName serviceUnit servicePricePerUnit"); // Select specific fields

		// Get total count for pagination
		const totalCount = await Service.countDocuments({ isDeleted: false });

		return res.status(200).json({
			success: true,
			data: services,
			pagination: {
				total_records: totalCount,
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

export const getServicesByName = async (req, res) => {
	try {
		const { name = "", page = 1, limit = 10 } = req.query;
		const skip = (page - 1) * limit;

		// Use Mongoose's text search for serviceName, which leverages the text index
		// or regex for partial, case-insensitive matching if text index is not desired for exact starts
		const query = {
			isDeleted: false,
			// For partial match at the beginning, similar to `ILIKE 'name%'`
			serviceName: { $regex: new RegExp(`^${name}`, "i") },
			// If you want broader "contains" search using the text index, use:
			// $text: { $search: name }
			// Note: For text index, you might want to consider scoring for relevance.
		};

		const services = await Service.find(query)
			.sort({ _id: 1 }) // Or by relevance if using text search: { score: { $meta: "textScore" } }
			.skip(skip)
			.limit(limit)
			.select("serviceName serviceUnit servicePricePerUnit");

		const totalCount = await Service.countDocuments(query);

		return res.status(200).json({
			success: true,
			data: services,
			pagination: {
				total_records: totalCount,
				page: parseInt(page, 10),
				limit: parseInt(limit, 10),
				total_pages: Math.ceil(totalCount / limit),
			},
		});
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// GET a single service by ID
export const getServiceById = async (req, res) => {
	try {
		const { id } = req.params;

		// Find a single service by its _id
		const service = await Service.findOne({
			_id: id,
			isDeleted: false,
		}).select("serviceName serviceUnit servicePricePerUnit");

		if (!service) {
			// Mongoose returns null if no document is found
			return res
				.status(404)
				.json({ success: false, message: "Service not found" });
		}

		return res.status(200).json({ success: true, data: service });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// CREATE a new service
export const createService = async (req, res) => {
	try {
		const { serviceName, serviceUnit, servicePricePerUnit } = req.body; // Use camelCase

		// Create a new Service document
		const newService = new Service({
			serviceName,
			serviceUnit,
			servicePricePerUnit,
			// isDeleted defaults to false as per schema
		});

		// Save the document to MongoDB
		const savedService = await newService.save();

		// Mongoose returns the saved document, convert to plain object for response
		const responseData = savedService.toObject();
		delete responseData.isDeleted; // Optionally remove isDeleted from response

		return res.status(201).json({ success: true, data: responseData });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// UPDATE a service by ID (partial)
export const updateServiceById = async (req, res) => {
	try {
		const { id } = req.params;
		const { serviceName, serviceUnit, servicePricePerUnit } = req.body; // Use camelCase

		// Build the update object dynamically
		const updateFields = {};
		if (serviceName !== undefined) updateFields.serviceName = serviceName;
		if (serviceUnit !== undefined) updateFields.serviceUnit = serviceUnit;
		if (servicePricePerUnit !== undefined)
			updateFields.servicePricePerUnit = servicePricePerUnit;

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		// Find the service by _id and update it.
		const updatedService = await Service.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query
			{ $set: updateFields }, // Update operation using $set
			{ new: true, runValidators: true } // Options
		).select("serviceName serviceUnit servicePricePerUnit");

		if (!updatedService) {
			return res.status(404).json({
				success: false,
				message: "Service not found or deleted",
			});
		}

		return res.status(200).json({ success: true, data: updatedService });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

// DELETE (soft-delete) a service by ID
export const deleteServiceById = async (req, res) => {
	try {
		const { id } = req.params;

		// Perform a soft delete by updating isDeleted to true
		const deletedService = await Service.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query: find by ID and ensure it's not already deleted
			{ $set: { isDeleted: true } }, // Update: set isDeleted to true
			{ new: true } // Return the updated document
		).select("_id"); // Only return the ID to confirm it was found

		if (!deletedService) {
			return res.status(404).json({
				success: false,
				message: "Service not found or already deleted",
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
