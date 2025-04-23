import express from "express";
const router = express.Router();
import { createUserValidation, updateUserValidation } from "../middleware/validators/userValidator.js";
import { handleValidationErrors } from "../middleware/handleValidationErrors.js";
import { getAllUsers, getUserById, createUser, updateUserByID, deleteUserByID } from "../controller/userController.js";

//GET
router.get("/", getAllUsers);

router.get("/:id", getUserById);

//POST
router.post("/", createUserValidation, handleValidationErrors, createUser);

//PUT
router.put("/:id", updateUserValidation, handleValidationErrors, updateUserByID);

//DELETE
router.delete("/:id", deleteUserByID);

export default router;