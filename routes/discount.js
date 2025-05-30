import express from "express";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

//controllers /////////////////////////////////////////////////////////
import {
	createDiscount,
	getAllDiscounts,
	getDiscountById,
	updateDiscountById,
	deleteDiscountById,
} from "../controller/discountController.js";

//validators /////////////////////////////////////////////////////////
import { validateIdParam } from "../middleware/validators/idValidator.js";
import {
	createDiscountValidation,
	updateDiscountValidation,
} from "../middleware/validators/discountValidator.js";

//auth middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";

const router = express.Router();

router.get("/", getAllDiscounts); //?page=1&limit=10
router.get("/:id", validateIdParam, handleValidationErrors, getDiscountById);

router.use(authorizeRoles(["admin", "manager"]));
router.post(
	"/",
	createDiscountValidation,
	handleValidationErrors,
	createDiscount
);
router.put(
	"/:id",
	validateIdParam,
	updateDiscountValidation,
	handleValidationErrors,
	updateDiscountById
);

router.delete(
	"/:id",
	validateIdParam,
	handleValidationErrors,
	deleteDiscountById
);

export default router;
