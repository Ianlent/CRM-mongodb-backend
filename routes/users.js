import express from "express";
const router = express.Router();

//validators /////////////////////////////////////////////////////////
import { validateIdParam } from "../middleware/validators/idValidator.js";
import {
	createUserValidation,
	updateUserValidation,
} from "../middleware/validators/userValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";

//controllers /////////////////////////////////////////////////////////
import {
	getAllUsers,
	getUserById,
	createUser,
	updateUserByID,
	deleteUserByID,
} from "../controller/userController.js";

//auth middleware /////////////////////////////////////////////////////////
import authorizeRoles from "../middleware/auth/authorizeRoles.js";
//////////////////////////////////////////////////////////////////////

//GET
router.get("/", authorizeRoles(["admin", "manager"]), getAllUsers); //?page=1&limit=10

router.get("/:id", validateIdParam, handleValidationErrors, getUserById);

//POST
router.post(
	"/",
	authorizeRoles(["admin", "manager"]),
	createUserValidation,
	handleValidationErrors,
	createUser
);

//PUT
router.put(
	"/:id",
	validateIdParam,
	updateUserValidation,
	handleValidationErrors,
	updateUserByID
);

//DELETE
router.delete("/:id", validateIdParam, handleValidationErrors, deleteUserByID);

export default router;
