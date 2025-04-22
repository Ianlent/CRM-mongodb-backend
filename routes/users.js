import express from "express";
const router = express.Router();
import { getAllUsers, getUserById, createUser, updateUserByID, deleteUserByID } from "../controller/userController.js";

//GET
router.get("/", getAllUsers);

router.get("/:id", getUserById);

//POST
router.post("/", createUser);

//PUT
router.put("/:id", updateUserByID);

//DELETE
router.delete("/:id", deleteUserByID);

export default router;