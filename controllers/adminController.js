const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin/adminModel");
const adminValidationSchema = require("../models/admin/adminValidation");
const logger = require("../logger/logger");
const generateToken = (id) => {
    return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

// 1. Create initial admin
exports.createInitialAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingAdmin = await Admin.findOne({ isInitialAdmin: true });
        if (existingAdmin) {
            return res.status(400).json({ ok: false, message: "Initial admin already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const admin = new Admin({
            username,
            email,
            password: hashedPassword,
            isInitialAdmin: true,
        });

        await admin.save();

        res.status(201).json({ ok: true, message: "Initial admin created successfully" });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

// 2. Create Admin
exports.createAdmin = async (req, res) => {
    try {
        logger.log("Creating new admin. Request user:", req.user);

        const { username, email, password } = req.body;

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            $or: [{ username }, { email }],
        });
        if (existingAdmin) {
            return res.status(400).json({ ok: false, message: "Admin already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = new Admin({
            username,
            email,
            password: hashedPassword,
        });

        await admin.save();

        res.status(201).json({ ok: true, message: "New admin created successfully" });
    } catch (error) {
        logger.error("Error in createAdmin:", error);
        if (error instanceof ZodError) {
            return res.status(400).json({
                ok: false,
                message: "Validation error",
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({
                ok: false,
                message: "Validation error",
                errors: Object.values(error.errors).map((err) => ({
                    field: err.path,
                    message: err.message,
                })),
            });
        }
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
exports.adminLogin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        try {
            adminValidationSchema.pick({ username: true, email: true }).parse({ username, email });
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

        const admin = await Admin.findOne({ username, email });
        if (!admin) {
            return res.status(401).json({ ok: false, message: "Invalid Username or Email" });
        }
        if (!(await bcrypt.compare(password, admin.password))) {
            return res.status(401).json({ ok: false, message: "Invalid password" });
        }
        if (admin.isInitialAdmin && !admin.isPasswordChanged) {
            return res.status(200).json({
                ok: true,
                message: "Please change your password",
                token: generateToken(admin._id),
                requirePasswordChange: true,
            });
        }

        res.json({ token: generateToken(admin._id), username: admin.username, email: admin.email });
    } catch (error) {
        logger.error("Error in admin login:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate new password
        try {
            adminValidationSchema.pick({ password: true }).parse({ password: newPassword });
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

        const admin = await Admin.findById(req.user.id);
        if (!admin) {
            return res.status(404).json({ ok: false, message: "Admin not found" });
        }

        if (!(await bcrypt.compare(currentPassword, admin.password))) {
            return res.status(401).json({ ok: false, message: "Current password is incorrect" });
        }

        admin.password = await bcrypt.hash(newPassword, 12);
        admin.isPasswordChanged = true;
        await admin.save();

        res.json({ ok: true, message: "Password changed successfully" });
    } catch (error) {
        logger.error("Error in changing password:", error);
        if (error instanceof ZodError) {
            return res.status(400).json({
                ok: false,
                message: "Validation error",
                errors: error.errors.map((err) => ({
                    field: err.path.join("."),
                    message: err.message,
                })),
            });
        }
        if (error.name === "ValidationError") {
            return res.status(400).json({
                ok: false,
                message: "Validation error",
                errors: Object.values(error.errors).map((err) => ({
                    field: err.path,
                    message: err.message,
                })),
            });
        }
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
