import { body } from "express-validator";

// Validation rules for user registration
export const registerValidation = [
	body('username')
	  .exists({ checkFalsy: true }).withMessage('Username is required')
	  .isLength({ min: 3, max: 32 }).withMessage('Username must be between 3 and 32 characters')
	  .trim()
	  .escape(),
  
	body('phone_number')
	  .optional({ nullable: true })
	  // Accepts international E.164 format (e.g. +84901234567)
	  .isMobilePhone('any', { strictMode: true }).withMessage('Invalid phone number; must be in international E.164 format')
	  .trim(),
  
	body('password')
	  .exists({ checkFalsy: true }).withMessage('Password is required')
	  .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
	  .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
	  .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  ];

// Validation rules for user login
export const loginValidation = [
	body('username')
	  .exists({ checkFalsy: true }).withMessage('Username is required')
	  .trim()
	  .escape(),
  
	body('password')
	  .exists({ checkFalsy: true }).withMessage('Password is required'),
  ];
  