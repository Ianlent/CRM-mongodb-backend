import Customer from "../models/customer.model.js"; // Import the Mongoose Customer model

export const getAllCustomers = async (req, res) => {
	try {
		// Find all customers that are not deleted, ordered by _id (which is roughly by creation time)
		const customers = await Customer.find({ isDeleted: false })
			.sort({ _id: 1 }) // Sort by _id ascending
			.select("firstName lastName phoneNumber address points"); // Select specific fields

		// Mongoose find returns an array directly, similar to result.rows
		return res.status(200).json({ success: true, data: customers });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getCustomerById = async (req, res) => {
	try {
		const { id } = req.params;

		// Find a single customer by their _id
		const customer = await Customer.findOne({
			_id: id,
			isDeleted: false,
		}).select("firstName lastName phoneNumber address points");

		if (!customer) {
			// Mongoose returns null if no document is found
			return res
				.status(404)
				.json({ success: false, message: "Customer not found" });
		}

		// Mongoose returns the document directly, no need for result.rows[0]
		return res.status(200).json({ success: true, data: customer });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const getCustomerByPhoneFirstLast = async (req, res) => {
	try {
		let { phoneNumber = "", firstName = "", lastName = "" } = req.body; // Use camelCase for consistency

		// Create a query object for Mongoose
		const query = {
			isDeleted: false,
			// Using regex for partial, case-insensitive matching
			phoneNumber: { $regex: new RegExp(`^${phoneNumber}`, "i") },
			firstName: { $regex: new RegExp(`^${firstName}`, "i") },
			lastName: { $regex: new RegExp(`^${lastName}`, "i") },
		};

		const customers = await Customer.find(query)
			.sort({ firstName: 1, lastName: 1 })
			.limit(50)
			.select("firstName lastName phoneNumber address points");

		if (customers.length === 0) {
			return res.status(200).json({
				success: true,
				data: [],
				canCreate: true,
				message:
					"No matching customers found. You can create a new one.",
			});
		}

		return res.status(200).json({ success: true, data: customers });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const createCustomer = async (req, res) => {
	try {
		const { firstName, lastName, phoneNumber, address } = req.body; // Use camelCase

		// Create a new Customer document
		const newCustomer = new Customer({
			firstName,
			lastName,
			phoneNumber: phoneNumber || null, // Mongoose handles null if not provided
			address,
			// points and isDeleted default as per schema
		});

		// Save the document to MongoDB
		const savedCustomer = await newCustomer.save();

		// Mongoose returns the saved document, convert to plain object for response
		const responseData = savedCustomer.toObject();
		// Optionally remove audit fields if not needed in response for creation
		delete responseData.isDeleted;
		delete responseData.createdAt;
		delete responseData.updatedAt;

		return res.status(201).json({ success: true, data: responseData });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const updateCustomerByID = async (req, res) => {
	try {
		const { id } = req.params;
		const { firstName, lastName, phoneNumber, address, points } = req.body; // Use camelCase

		// Build the update object dynamically
		const updateFields = {};
		if (firstName !== undefined) updateFields.firstName = firstName;
		if (lastName !== undefined) updateFields.lastName = lastName;
		if (phoneNumber !== undefined)
			updateFields.phoneNumber = phoneNumber || null; // Handle explicit null
		if (address !== undefined) updateFields.address = address;
		if (points !== undefined) updateFields.points = points;

		if (Object.keys(updateFields).length === 0) {
			return res
				.status(400)
				.json({ success: false, message: "No fields to update" });
		}

		// Find the customer by _id and update it.
		// { new: true } returns the updated document.
		// { runValidators: true } runs schema validators on the update operation.
		const updatedCustomer = await Customer.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query
			{ $set: updateFields }, // Update operation using $set
			{ new: true, runValidators: true } // Options
		).select("firstName lastName phoneNumber address points");

		if (!updatedCustomer) {
			return res.status(404).json({
				success: false,
				message: "Customer not found or deleted",
			});
		}

		return res.status(200).json({ success: true, data: updatedCustomer });
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};

export const deleteCustomerByID = async (req, res) => {
	try {
		const { id } = req.params;

		// Perform a soft delete by updating isDeleted to true
		const deletedCustomer = await Customer.findOneAndUpdate(
			{ _id: id, isDeleted: false }, // Query: find by ID and ensure it's not already deleted
			{ $set: { isDeleted: true } }, // Update: set isDeleted to true
			{ new: true } // Return the updated document
		).select("_id"); // Only return the ID to confirm it was found

		if (!deletedCustomer) {
			return res.status(404).json({
				success: false,
				message: "Customer not found or already deleted",
			});
		}

		return res.status(204).send(); // 204 No Content for successful deletion
	} catch (err) {
		console.error(err.message);
		return res
			.status(500)
			.json({ success: false, message: "Internal Server Error" });
	}
};
