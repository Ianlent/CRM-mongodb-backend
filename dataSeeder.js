// seed.js
import mongoose from "mongoose";
import bcrypt from "bcrypt"; // Using 'bcrypt' now
import dotenv from "dotenv";

// Import models
import User from "./models/user.model.js";
import Customer from "./models/customer.model.js";
import Service from "./models/service.model.js";
import Discount from "./models/discount.model.js"; // Your Discount model
import Expense from "./models/expense.model.js";
import Order from "./models/order.model.js";

dotenv.config(); // Load environment variables from .env file

// --- Configuration ---
const MONGODB_URI = process.env.MONGO_URI_DEV;
const CLEAR_EXISTING_DATA = true; // Set to true to clear all collections before seeding

// --- Define date boundaries (May 1st, 2025, to today) ---
const MAY_2025_START = new Date("2025-05-01T00:00:00.000Z");
const TODAY_END = new Date(); // Sets the end date to the current date and time
const DURATION_MS = TODAY_END.getTime() - MAY_2025_START.getTime();

// Helper function to generate a random date within the defined range
const getRandomDate = () => {
	return new Date(MAY_2025_START.getTime() + Math.random() * DURATION_MS);
};

// Helper function to generate a valid ObjectId-like string
const generateObjectId = () => {
	return new mongoose.Types.ObjectId().toHexString();
};

// --- Comprehensive Vietnamese Mobile Prefixes ---
const phonePrefixes = [
	"032",
	"033",
	"034",
	"035",
	"036",
	"037",
	"038",
	"039",
	"070",
	"076",
	"077",
	"078",
	"079",
	"081",
	"082",
	"083",
	"084",
	"085",
	"056",
	"058",
	"059",
	"086",
	"096",
	"097",
	"098",
	"089",
	"090",
	"093",
	"088",
	"091",
	"094",
	"092",
	"099",
];

// --- Function to ensure a single admin user exists ---
const ensureAdminUserExists = async () => {
	const saltRounds = 10;

	try {
		const existingAdmin = await User.findOne({ userRole: "admin" });
		if (existingAdmin) {
			console.log("Admin user already exists. Skipping creation.");
			return existingAdmin;
		}

		// --- TEST ACCOUNT DETAILS ---
		const username = "test_admin";
		const password = "test_password"; // Simplified password for testing
		const adminPhoneNumber = "0901234567"; // A simple, valid Vietnamese test number
		// --- END TEST ACCOUNT DETAILS ---

		const passwordHash = await bcrypt.hash(password, saltRounds);

		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		const newAdmin = new User({
			username: username,
			passwordHash: passwordHash,
			userRole: "admin",
			userStatus: "active",
			phoneNumber: adminPhoneNumber,
			isDeleted: false,
			createdAt: createdAt,
			updatedAt: updatedAt,
		});

		const savedAdmin = await newAdmin.save(); // This saves the admin user to the DB
		console.log("Test admin user created successfully:");
		console.log({
			_id: savedAdmin._id,
			username: savedAdmin.username,
			userRole: savedAdmin.userRole,
			userStatus: savedAdmin.userStatus,
			phoneNumber: savedAdmin.phoneNumber,
		});
		return savedAdmin; // Return the saved Mongoose document
	} catch (error) {
		console.error("Error creating test admin user:", error);
		throw error; // Re-throw to be caught by the main seeding function
	}
};

// --- Data Generation Logic (Laundry Theme) ---
const generateSeedData = async (adminUser) => {
	const seed = {};

	// 1. Users (Only employees and managers, admin is handled separately)
	const nonAdminUserRoles = ["employee", "manager"]; // Exclude admin role from random generation
	const userStatuses = ["active", "suspended"];
	const password = "password123";
	const saltRounds = 10;
	const passwordHash = await bcrypt.hash(password, saltRounds);

	seed.users = [];
	// DO NOT push adminUser here. It's already saved by ensureAdminUserExists.
	// We will only insert non-admin users with insertMany.

	for (let i = 1; i <= 4; i++) {
		// Generate 4 non-admin users
		const userId = generateObjectId();
		const suffix = String(Math.floor(1000000 + Math.random() * 9000000));
		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		seed.users.push({
			_id: userId,
			username: `laundry_staff_${i}`,
			userRole:
				nonAdminUserRoles[
					Math.floor(Math.random() * nonAdminUserRoles.length)
				],
			userStatus:
				userStatuses[Math.floor(Math.random() * userStatuses.length)],
			phoneNumber: `${
				phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)]
			}${suffix}`,
			passwordHash: passwordHash,
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	// 2. Services
	const serviceNames = [
		"Standard Wash & Fold",
		"Delicate Dry Cleaning",
		"Express Ironing",
		"Stain Removal (Advanced)",
		"Alterations",
		"Duvet & Comforter Cleaning",
		"Rug Cleaning",
		"Shoe Cleaning",
	];
	const serviceUnits = ["kg", "item", "load", "sq meter", "pair"];
	// Changed: Moderated service prices to align better with expenses
	const servicePrices = [
		10, // Standard Wash & Fold (per kg)
		40, // Delicate Dry Cleaning (per item)
		25, // Express Ironing (per item)
		30, // Stain Removal (Advanced) (per item)
		60, // Alterations (per item)
		70, // Duvet & Comforter Cleaning (per item)
		80, // Rug Cleaning (per sq meter)
		35, // Shoe Cleaning (per pair)
	];

	seed.services = [];
	for (let i = 0; i < serviceNames.length; i++) {
		const serviceId = generateObjectId();
		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		seed.services.push({
			_id: serviceId,
			serviceName: serviceNames[i],
			serviceUnit: serviceUnits[i] || "item",
			servicePricePerUnit: servicePrices[i],
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	// 3. Customers
	const firstNames = [
		"Nguyen",
		"Tran",
		"Le",
		"Pham",
		"Hoang",
		"Huynh",
		"Phan",
		"Vu",
		"Dang",
		"Bui",
	];
	const lastNames = [
		"Minh",
		"Thu",
		"Anh",
		"Hung",
		"Thao",
		"Long",
		"Mai",
		"Quang",
		"Vy",
		"Dung",
	];
	const addresses = [
		"123 Cau Giay, Hanoi",
		"456 Hoan Kiem, Hanoi",
		"789 District 1, HCMC",
		"101 District 3, HCMC",
		"202 Hai Ba Trung, Hanoi",
		"303 Tan Binh, HCMC",
		"404 Ba Dinh, Hanoi",
		"505 Phu Nhuan, HCMC",
	];

	seed.customers = [];
	for (let i = 1; i <= 20; i++) {
		const customerId = generateObjectId();
		const suffix = String(Math.floor(1000000 + Math.random() * 9000000));
		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		seed.customers.push({
			_id: customerId,
			firstName:
				firstNames[Math.floor(Math.random() * firstNames.length)],
			lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
			phoneNumber: `${
				phonePrefixes[Math.floor(Math.random() * phonePrefixes.length)]
			}${suffix}`,
			address: addresses[Math.floor(Math.random() * addresses.length)],
			points: Math.floor(Math.random() * 1000),
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	// 4. Discounts
	const discountNames = [
		"Loyalty Member",
		"First Order Bonus",
		"Weekend Saver",
		"Large Order Discount",
		"New Customer Welcome",
		"Seasonal Special",
		"Holiday Promo",
		"Referral Friend",
	];
	seed.discounts = [];
	for (let i = 0; i < discountNames.length; i++) {
		// Loop through all defined discount names
		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		// Ensure unique requiredPoints to avoid duplicates if iterating with fixed increments
		const requiredPoints = (i + 1) * 50 + Math.floor(Math.random() * 20); // Add some randomness
		const discountType = Math.random() > 0.5 ? "percent" : "fixed";
		const amount =
			discountType === "percent"
				? Math.floor(Math.random() * (20 - 5 + 1)) + 5
				: Math.floor(Math.random() * (50 - 10 + 1)) + 10; // 5-20% or 10-50 fixed

		seed.discounts.push({
			_id: generateObjectId(),
			discountName: discountNames[i], // Assign a unique name from the array
			requiredPoints: requiredPoints,
			discountType: discountType,
			amount: amount,
			// isDeleted will default to false as per schema, which is generally desired for seeded data
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	// 5. Expenses
	const expenseDescriptions = [
		"Detergent & Softener Purchase",
		"Water & Electricity Bill",
		"Laundry Machine Maintenance",
		"Staff Wages",
		"Rent Payment",
		"Marketing & Advertising",
		"Packaging Supplies",
	];
	seed.expenses = [];
	for (let i = 1; i <= 15; i++) {
		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		seed.expenses.push({
			_id: generateObjectId(),
			// Confirmed: Expense amount is now between 50 and 100
			amount: Math.floor(Math.random() * (100 - 50 + 1)) + 50,
			expenseDate: getRandomDate(),
			expenseDescription:
				expenseDescriptions[
					Math.floor(Math.random() * expenseDescriptions.length)
				],
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	// 6. Orders
	const orderStatuses = ["pending", "confirmed", "completed", "cancelled"];
	seed.orders = [];
	const handlerUsers = [adminUser, ...seed.users]; // Combine admin with other generated users

	for (let i = 1; i <= 50; i++) {
		const customer =
			seed.customers[Math.floor(Math.random() * seed.customers.length)];
		const handler =
			Math.random() > 0.2 && handlerUsers.length > 0
				? handlerUsers[Math.floor(Math.random() * handlerUsers.length)]
				: null;
		const discount =
			Math.random() > 0.4 // 60% chance of no discount
				? seed.discounts[
						Math.floor(Math.random() * seed.discounts.length)
				  ]
				: null;

		const orderServices = [];
		let totalOrderPriceRaw = 0;
		const numServicesInOrder = Math.floor(Math.random() * 3) + 1; // 1 to 3 services per order

		for (let j = 0; j < numServicesInOrder; j++) {
			const service =
				seed.services[Math.floor(Math.random() * seed.services.length)];
			const numberOfUnit = Math.floor(Math.random() * 5) + 1; // 1 to 5 units per service
			const totalPrice = service.servicePricePerUnit * numberOfUnit;
			totalOrderPriceRaw += totalPrice;

			orderServices.push({
				serviceId: service._id,
				serviceName: service.serviceName,
				serviceUnit: service.serviceUnit,
				pricePerUnit: service.servicePricePerUnit,
				numberOfUnit: numberOfUnit,
				totalPrice: totalPrice,
			});
		}

		let finalOrderPrice = totalOrderPriceRaw;
		if (discount) {
			if (discount.discountType === "percent") {
				finalOrderPrice = finalOrderPrice * (1 - discount.amount / 100);
			} else if (discount.discountType === "fixed") {
				finalOrderPrice = Math.max(
					0,
					finalOrderPrice - discount.amount
				);
			}
		}

		const createdAt = getRandomDate();
		let updatedAt = getRandomDate();
		if (updatedAt < createdAt) {
			updatedAt = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}
		// Set completedOn date for 'completed' orders
		let completedOnDate = null;
		const currentOrderStatus =
			orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
		if (currentOrderStatus === "completed") {
			// Ensure completedOn is after createdAt
			completedOnDate = new Date(
				createdAt.getTime() +
					Math.random() * (TODAY_END.getTime() - createdAt.getTime())
			);
		}

		seed.orders.push({
			_id: generateObjectId(),
			customerId: customer._id,
			customerInfo: {
				firstName: customer.firstName,
				lastName: customer.lastName,
				phoneNumber: customer.phoneNumber,
				address: customer.address,
			},
			orderDate: getRandomDate(),
			handlerId: handler ? handler._id : null,
			handlerInfo: handler
				? {
						username: handler.username,
						userRole: handler.userRole,
				  }
				: null,
			orderStatus: currentOrderStatus,
			discountId: discount ? discount._id : null,
			discountInfo: discount
				? {
						discountType: discount.discountType,
						amount: discount.amount,
						// Add discountName to discountInfo if it's relevant for orders
						discountName: discount.discountName, // Include the new field
				  }
				: null,
			services: orderServices,
			completedOn: completedOnDate, // Add completedOn field
			isDeleted: false,
			createdAt: createdAt,
			updatedAt: updatedAt,
		});
	}

	return seed;
};

// --- Main Seeding Function ---
const seedDatabase = async () => {
	try {
		await mongoose.connect(MONGODB_URI);
		console.log("MongoDB connected successfully.");

		if (CLEAR_EXISTING_DATA) {
			console.log("Clearing existing data...");
			await Promise.all([
				User.deleteMany({}),
				Customer.deleteMany({}),
				Service.deleteMany({}),
				Discount.deleteMany({}),
				Expense.deleteMany({}),
				Order.deleteMany({}),
			]);
			console.log("Existing data cleared.");
		}

		// 1. Ensure a single admin user exists and is saved to DB
		const adminUser = await ensureAdminUserExists();

		// 2. Generate remaining seed data (which will only include non-admin users)
		const data = await generateSeedData(adminUser);

		// 3. Insert other collections (only non-admin users here, admin already inserted)
		console.log("Inserting non-admin users...");
		await User.insertMany(data.users);
		console.log(`${data.users.length} non-admin users inserted.`);

		console.log("Inserting services...");
		await Service.insertMany(data.services);
		console.log(`${data.services.length} services inserted.`);

		console.log("Inserting customers...");
		await Customer.insertMany(data.customers);
		console.log(`${data.customers.length} customers inserted.`);

		console.log("Inserting discounts...");
		await Discount.insertMany(data.discounts);
		console.log(`${data.discounts.length} discounts inserted.`);

		console.log("Inserting expenses...");
		await Expense.insertMany(data.expenses);
		console.log(`${data.expenses.length} expenses inserted.`);

		console.log("Inserting orders...");
		await Order.insertMany(data.orders);
		console.log(`${data.orders.length} orders inserted.`);

		console.log("\nDatabase seeding completed successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
		process.exit(1);
	} finally {
		await mongoose.disconnect();
		console.log("MongoDB disconnected.");
	}
};

// Execute the seeding function
seedDatabase();
