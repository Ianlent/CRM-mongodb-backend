import express from "express";

//controllers /////////////////////////////////////////////////////////
import {
	getAllCustomers,
	getCustomerById,
	getCustomerByPhoneFirstLast,
	createCustomer,
	updateCustomerByID,
	deleteCustomerByID,
} from "../controller/customerController.js";

//validators /////////////////////////////////////////////////////////
import { validateIdParam } from "../middleware/validators/idValidator.js";
import {
	createCustomerValidation,
	updateCustomerValidation,
} from "../middleware/validators/customerValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

//auth middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
//////////////////////////////////////////////////////////////////////
const router = express.Router();

//get
router.get("/", getAllCustomers); //?page=1&limit=6

router.get("/search", getCustomerByPhoneFirstLast); //?page=1&limit=6

router.get("/:id", validateIdParam, handleValidationErrors, getCustomerById);

// //post
router.post(
	"/",
	createCustomerValidation,
	handleValidationErrors,
	createCustomer
);

router.use(authorizeRoles(["admin", "manager"]));
// //put
router.put(
	"/:id",
	validateIdParam,
	updateCustomerValidation,
	handleValidationErrors,
	updateCustomerByID
);

// //delete
router.delete(
	"/:id",
	validateIdParam,
	handleValidationErrors,
	deleteCustomerByID
);

export default router;
