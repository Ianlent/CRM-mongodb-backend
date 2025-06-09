import express from "express";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

//controllers /////////////////////////////////////////////////////////
import {
	getDailyExpenseDetailsForAnalytics,
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

router.get("/", getDailyExpenseDetailsForAnalytics);
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
