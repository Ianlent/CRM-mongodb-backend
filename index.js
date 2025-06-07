import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js"; // Import the connectDB function
import mongoSanitize from "express-mongo-sanitize";

//middleware /////////////////////////////////////////////////////////
import authenticateToken from "./middleware/auth/authenticateToken.js";
import authorizeRoles from "./middleware/auth/authorizeRoles.js";
//////////////////////////////////////////////////////////////////////

//routes //////////////////////////////////
import auth from "./routes/auth.js";
import users from "./routes/users.js";
import customers from "./routes/customers.js";
import expenses from "./routes/expenses.js";
import services from "./routes/services.js";
import discounts from "./routes/discount.js";
import order from "./routes/order.js";
import analytics from "./routes/analytics.js";
///////////////////////////////////////////

const app = express();

// Middleware setup
app.use(cors());
app.use(express.json()); // For parsing application/json

app.use(mongoSanitize());

// Auth entry point (public route)
app.use("/auth", auth);

// Protected routes - apply authentication middleware here
app.use(authenticateToken); // All routes below this will require a valid token

// API routes with authorization where specified
app.use("/api/users", users);
app.use("/api/customers", customers); // authorization handled separately in route for finer control
app.use("/api/expenses", authorizeRoles(["admin", "manager"]), expenses); // more authorization handled separately in route for finer control
app.use("/api/services", services); // more authorization handled separately in route for finer control
app.use("/api/discounts", discounts);
app.use("/api/orders", order);

app.use("/api/analytics", authorizeRoles(["admin", "manager"]), analytics);

// Start the server after connecting to the database
const startServer = async () => {
	try {
		await connectDB(); // Connect to MongoDB
		app.listen(process.env.PORT, () => {
			console.log(
				`Backend running on http://localhost:${process.env.PORT}`
			);
		});
	} catch (error) {
		console.error(
			"Failed to connect to the database or start server:",
			error
		);
		process.exit(1); // Exit process with failure
	}
};

startServer(); // Invoke the function to start the server
