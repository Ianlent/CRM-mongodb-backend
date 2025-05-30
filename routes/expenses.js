import express from "express";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

//controllers /////////////////////////////////////////////////////////
import {
	getAllExpenses,
	getExpensesByDateRange,
	getExpenseById,
	createExpense,
	updateExpenseByID,
	deleteExpenseByID,
} from "../controller/expenseController.js";

//validators /////////////////////////////////////////////////////////
import { validateIdParam } from "../middleware/validators/idValidator.js";
import {
	createExpenseValidation,
	updateExpenseValidation,
} from "../middleware/validators/expenseValidator.js";

//auth middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
//////////////////////////////////////////////////////////////////////

const router = express.Router();

// GET
router.get("/", getAllExpenses); //?page=1&limit=10

router.get("/by-date-range", getExpensesByDateRange); //range?start=2025-04-01&end=2025-04-30

router.get("/:id", validateIdParam, handleValidationErrors, getExpenseById);

// POST
router.post(
	"/",
	createExpenseValidation,
	handleValidationErrors,
	createExpense
);

//admin only routes
router.use(authorizeRoles(["admin"]));
// PUT
router.put(
	"/:id",
	validateIdParam,
	updateExpenseValidation,
	handleValidationErrors,
	updateExpenseByID
);

// DELETE
router.delete(
	"/:id",
	validateIdParam,
	handleValidationErrors,
	deleteExpenseByID
);

export default router;
