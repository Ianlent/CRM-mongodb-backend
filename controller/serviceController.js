import Service from "../models/service.model.js"; // Import the Mongoose Service model

// GET all services with optional pagination
export const getServices = async (req, res) => {
	try {
		const { search = "", page = 1, limit = 10 } = req.query;
		const skip = (page - 1) * limit;

		let query = {
			isDeleted: false,
		};

		if (search) {
			// Use '^' to match from the beginning of the string
			query.serviceName = { $regex: `^${search}`, $options: "i" }; // 'i' for case-insensitive
		}

		// For "starts with" queries, sorting by serviceName is often desired
		let sortOrder = { serviceName: 1 }; // Sort by serviceName ascending by default

		// Find services based on the constructed query, with pagination
		const services = await Service.find(query)
			.sort(sortOrder)
			.skip(skip)
			.limit(limit)
			.select("serviceName serviceUnit servicePricePerUnit");

		// Get total count for pagination based on the same query
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
