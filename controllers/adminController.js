const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin/adminModel");
const Vendor = require("../models/vendor/vendorModel");
const adminValidationSchema = require("../models/admin/adminValidation");
const logger = require("../logger/logger");
const vendorValidationSchema = require("../models/vendor/vendorValidation");
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

// 3. Admin Login
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
// 4.Change Password
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
// 5. Create Vendor
exports.createVendor = async (req, res) => {
    try {
        logger.log("Creating new vendor. Request user:", req.user);

        const { username, email, phone, cin, address, password } = req.body;

        // Check if vendor already exists
        const existingVendor = await Vendor.findOne({ $or: [{ email }, { cin }] });
        if (existingVendor) {
            return res.status(400).json({ ok: false, message: "Vendor with this username and email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const vendor = new Vendor({
            username,
            email,
            cin,
            phone,
            address,
            password: hashedPassword,
        });

        await vendor.save();

        res.status(201).json({ ok: true, message: "New vendor created successfully" });
    } catch (error) {
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
// 6. Update vendor
exports.updateVendor = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, phone, address, status } = req.body;
        // Find the vendor
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ ok: false, message: "Vendor not found" });
        }
        // Check if email is being changed and if it's already in use
        if (email && email !== vendor.email) {
            const existingVendor = await Vendor.findOne({ email });
            if (existingVendor) {
                return res.status(400).json({ ok: false, message: "Email already in use" });
            }
        }
        // Update fields
        if (username) vendor.name = username;
        if (email) vendor.email = email;
        if (phone) vendor.phone = phone;
        if (address) vendor.address = address;
        if (status && ["active", "disabled"].includes(status)) vendor.status = status;
        // Validate the updated vendor
        try {
            vendorValidationSchema.partial().parse(vendor.toObject());
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
        // Save the updated vendor
        await vendor.save();
        res.json({
            ok: true,
            message: "Vendor updated successfully",
            vendor: {
                id: vendor._id,
                username: vendor.username,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                status: vendor.status,
            },
        });
    } catch (error) {
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
// 7. Get all vendors
exports.getAllVendors = async (req, res) => {
    try {
        logger.info(`Fetching all vendors. Request user: ${req.user.id}`);

        const vendors = await Vendor.find().select("-__v").sort({ createdAt: -1 });

        res.json({
            ok: true,
            vendors: vendors.map((vendor) => ({
                id: vendor._id,
                username: vendor.username,
                email: vendor.email,
                phone: vendor.phone,
                address: vendor.address,
                status: vendor.status,
                cin: vendor.cin,
                createdAt: vendor.createdAt,
                updatedAt: vendor.updatedAt,
            })),
            totalVendors: vendors.length,
        });
    } catch (error) {
        logger.error("Error in getAllVendors:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};
