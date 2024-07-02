// controllers/vendorController.js
const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor/vendorModel");
const vendorValidationSchema = require("../models/vendor/vendorValidation");
const logger = require("../logger/logger");

const generateToken = (id) => {
    return jwt.sign({ id, role: "vendor" }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// Vendor Login
exports.vendorLogin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        try {
            vendorValidationSchema.pick({ email: true, username: true }).parse({ username, email });
        } catch (zodError) {
            return res.status(400).json({
                ok: false,
                message: "Validation error",
                errors: zodError.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }

        const vendor = await Vendor.findOne({ username, email });
        if (!vendor) {
            return res.status(401).json({ ok: false, message: "Invalid username and email" });
        }

        if (vendor.status === "disabled") {
            return res.status(401).json({ ok: false, message: "Vendor account is disabled" });
        }

        if (!(await bcrypt.compare(password, vendor.password))) {
            return res.status(401).json({ ok: false, message: "Invalid password" });
        }

        res.json({
            ok: true,
            token: generateToken(vendor._id),
            vendor: {
                id: vendor._id,
                name: vendor.name,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                cin: vendor.cin,
                status: vendor.status,
            },
        });
    } catch (error) {
        logger.error("Error in vendor login:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
