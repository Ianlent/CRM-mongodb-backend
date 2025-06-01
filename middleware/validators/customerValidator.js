import { body } from "express-validator";

const vietnameseMobilePrefixes = [
	"032",
	"033",
	"034",
	"035",
	"036",
	"037",
	"038",
	"039", // Viettel (new)
	"070",
	"076",
	"077",
	"078",
	"079", // MobiFone (new)
	"081",
	"082",
	"083",
	"084",
	"085", // VinaPhone (new)
	"056",
	"058", // Vietnamobile (new)
	"059", // Gmobile (new)
	"086",
	"096",
	"097",
	"098", // Viettel (old 09x series)
	"089",
	"090",
	"093", // MobiFone (old 09x series)
	"088",
	"091",
	"094", // VinaPhone (old 09x series)
	"092", // Vietnamobile (old 09x series)
	"099", // Gmobile (old 09x series)
];

// Sort prefixes by length descending, then alphabetically, to ensure longer prefixes
// are matched first by regex (e.g., 081 before 08 if we had 08)
// Though in this specific list, all are 3-digit, sorting helps with general regex practice.
vietnameseMobilePrefixes.sort(
	(a, b) => b.length - a.length || a.localeCompare(b)
);

const phoneNumberRegex = new RegExp(
	`^(${vietnameseMobilePrefixes.join("|")})[0-9]{7}$`
);

export const createCustomerValidation = [
	body("firstName")
		.exists({ checkFalsy: true })
		.withMessage("First name is required")
		.isLength({ min: 2, max: 32 })
		.withMessage("First name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("lastName")
		.exists({ checkFalsy: true })
		.withMessage("Last name is required")
		.isLength({ min: 2, max: 32 })
		.withMessage("Last name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.trim() // Remove leading/trailing whitespace
		.notEmpty()
		.withMessage("Phone number is required.") // Ensure it's not empty
		.isString()
		.withMessage("Phone number must be a string.") // Ensure it's a string
		.isLength({ min: 10, max: 10 })
		.withMessage("Phone number must be exactly 10 digits long.") // Explicitly check total length
		.matches(phoneNumberRegex)
		.withMessage(
			"Invalid Vietnamese phone number format. It must be a 10-digit number starting with a valid mobile carrier prefix (e.g., 090, 032, 079)."
		),

	body("address")
		.not()
		.isEmpty()
		.withMessage("Address is required")
		.isLength({ min: 5, max: 128 })
		.withMessage("Address must be between 5 and 128 characters")
		.trim()
		.escape(),

	body("points")
		.optional({ nullable: true })
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer"),
];

export const updateCustomerValidation = [
	body("firstName")
		.optional({ checkFalsy: true })
		.isLength({ min: 2, max: 32 })
		.withMessage("First name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("lastName")
		.optional({ checkFalsy: true })
		.isLength({ min: 2, max: 32 })
		.withMessage("Last name must be between 2 and 32 characters")
		.trim()
		.escape(),

	body("phoneNumber")
		.optional({ nullable: true })
		.trim() // Remove leading/trailing whitespace
		.notEmpty()
		.withMessage("Phone number is required.") // Ensure it's not empty
		.isString()
		.withMessage("Phone number must be a string.") // Ensure it's a string
		.isLength({ min: 10, max: 10 })
		.withMessage("Phone number must be exactly 10 digits long.") // Explicitly check total length
		.matches(phoneNumberRegex)
		.withMessage(
			"Invalid Vietnamese phone number format. It must be a 10-digit number starting with a valid mobile carrier prefix (e.g., 090, 032, 079)."
		),

	body("address")
		.optional({ checkFalsy: true })
		.isLength({ min: 5, max: 128 })
		.withMessage("Address must be between 5 and 128 characters")
		.trim()
		.escape(),

	body("points")
		.optional({ nullable: true })
		.isInt({ min: 0 })
		.withMessage("Points must be a non-negative integer"),
];
