const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin/adminModel");
const Vendor = require("../models/vendor/vendorModel");
const adminValidationSchema = require("../models/admin/adminValidation");
const logger = require("../logger/logger");
const vendorValidationSchema = require("../models/vendor/vendorValidation");
const { Menu, Item } = require("../models/menu/menuModel");
const CacheService = require("../cacheServer");
const cache = new CacheService(60 * 60);
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
        if (!admin.isPasswordChanged) {
            return res.status(200).json({
                ok: false,
                message: "Please change your password",
                token: generateToken(admin._id),
                requirePasswordChange: true,
            });
        }

        res.json({ ok: true, token: generateToken(admin._id), username: admin.username, email: admin.email });
    } catch (error) {
        logger.error("Error in admin login:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
// 4.Change Admin Password
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
        const { username, email, logo, phone, gstNumber, address, theme, password } = req.body;

        const emailCacheKey = `vendor:email:${email}`;
        const gstCacheKey = gstNumber ? `vendor:gst:${gstNumber}` : null;

        let existingVendorByEmail = cache.get(emailCacheKey);
        let existingVendorByGST = gstNumber ? cache.get(gstCacheKey) : null;

        if (existingVendorByEmail === undefined) {
            existingVendorByEmail = await Vendor.findOne({ email });
            cache.set(emailCacheKey, existingVendorByEmail || null);
        }

        if (gstNumber && existingVendorByGST === undefined) {
            existingVendorByGST = await Vendor.findOne({ gstNumber });
            cache.set(gstCacheKey, existingVendorByGST || null);
        }

        if (existingVendorByEmail || existingVendorByGST) {
            return res.status(400).json({
                ok: false,
                message:
                    existingVendorByEmail && existingVendorByGST
                        ? "Vendor with this email and GST number already exists"
                        : existingVendorByEmail
                        ? "Vendor with this email already exists"
                        : "Vendor with this GST number already exists",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const vendor = new Vendor({
            username,
            email,
            theme,
            gstNumber,
            phone,
            address,
            logo,
            password: hashedPassword,
        });
        await vendor.save();

        cache.del(emailCacheKey);
        if (gstCacheKey) cache.del(gstCacheKey);

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
            })),
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
// 8. Delete Admin
exports.deleteAdmin = async (req, res) => {
    try {
        logger.info(`Deleting admin. Request user: ${req.user.id}`);

        const { id } = req.params;

        // Prevent deleting the initial admin
        const adminToDelete = await Admin.findById(id);
        if (!adminToDelete) {
            return res.status(404).json({ ok: false, message: "Admin not found" });
        }
        if (adminToDelete.isInitialAdmin) {
            return res.status(403).json({ ok: false, message: "Cannot delete the initial admin" });
        }

        // Prevent self-deletion
        if (id === req.user.id) {
            return res.status(403).json({ ok: false, message: "Cannot delete your own account" });
        }

        const deletedAdmin = await Admin.findByIdAndDelete(id);

        if (!deletedAdmin) {
            return res.status(404).json({ ok: false, message: "Admin not found" });
        }

        res.json({
            ok: true,
            message: "Admin deleted successfully",
        });
    } catch (error) {
        logger.error("Error in deleteAdmin:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};
// 9. Delete Vendor
exports.deleteVendor = async (req, res) => {
    try {
        logger.info(`Deleting vendor. Request user: ${req.user.id}`);

        const { id } = req.params;

        const deletedVendor = await Vendor.findByIdAndDelete(id);

        if (!deletedVendor) {
            return res.status(404).json({ ok: false, message: "Vendor not found" });
        }

        res.json({
            ok: true,
            message: "Vendor deleted successfully",
            deletedVendor: {
                id: deletedVendor._id,
                username: deletedVendor.username,
                email: deletedVendor.email,
                cin: deletedVendor.cin,
            },
        });
    } catch (error) {
        logger.error("Error in deleteVendor:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};
// 10. Change Vendor Password
exports.changeVendorPassword = async (req, res) => {
    try {
        console.log("Controller User:", req.user);
        const { id } = req.params;
        const { newPassword } = req.body;

        // Find the vendor
        const vendor = await Vendor.findById(id);
        if (!vendor) {
            return res.status(404).json({ ok: false, message: "Vendor not found" });
        }

        // Check if the request is coming from admin
        const isAdmin = req.user.role === "admin";

        if (!isAdmin) {
            return res.status(403).json({ ok: false, message: "Not authorized to change this vendor's password" });
        }

        // Validate new password
        if (newPassword.length < 8) {
            return res.status(400).json({ ok: false, message: "New password must be at least 8 characters long" });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the password
        vendor.password = hashedPassword;
        await vendor.save();

        res.json({
            ok: true,
            message: "Vendor password changed successfully",
        });
    } catch (error) {
        logger.error("Error in changeVendorPassword:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};

// 11. Get all admins
exports.getAllAdmins = async (req, res) => {
    try {
        logger.info(`Fetching all admins. Request user: ${req.user.id}`);

        // Check if the requester is an admin
        if (req.user.role !== "admin") {
            return res.status(403).json({
                ok: false,
                message: "Access denied. Only admins can fetch admin list.",
            });
        }

        const admins = await Admin.find().select("-password -__v").sort({ createdAt: -1 });

        res.json({
            ok: true,
            admins: admins.map((admin) => ({
                id: admin._id,
                username: admin.username,
                email: admin.email,
                role: admin.role,
                isInitialAdmin: admin.isInitialAdmin,
                isPasswordChanged: admin.isPasswordChanged,
                createdAt: admin.createdAt,
                updatedAt: admin.updatedAt,
            })),
        });
    } catch (error) {
        logger.error("Error in getAllAdmins:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};
// 12.Return Dashboard Numbers
exports.getDashboardStats = async (req, res) => {
    try {
        logger.info(`Fetching dashboard stats. Request user: ${req.user.id}`);

        // Check if the requester is an admin
        if (req.user.role !== "admin") {
            return res.status(403).json({
                ok: false,
                message: "Access denied. Only admins can fetch dashboard stats.",
            });
        }

        // Get count of admins
        const adminCount = await Admin.countDocuments();

        // Get count of vendors
        const vendorCount = await Vendor.countDocuments();

        // For categories, subcategories, and items, we'll return 0 as they're not implemented yet
        const categoryCount = 0;
        const subcategoryCount = 0;
        const itemCount = 0;

        res.json({
            ok: true,
            stats: {
                totalAdmins: adminCount,
                totalVendors: vendorCount,
                totalCategories: categoryCount,
                totalSubcategories: subcategoryCount,
                totalItems: itemCount,
            },
        });
    } catch (error) {
        logger.error("Error in getDashboardStats:", error);
        res.status(500).json({
            ok: false,
            message: "Server error",
            error: error.message || "Unknown error occurred",
        });
    }
};
// 13. Get All Categories
exports.getAllCategories = async (req, res) => {
    try {
        const menus = await Menu.find()
            .select("categories")
            .populate({
                path: "categories.subcategories.items",
                select: "-__v",
            })
            .select("-__v");

        let categories = [];
        menus.forEach((menu) => {
            categories.push(...menu.categories);
        });

        res.json({ ok: true, categories: categories });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

// 14. Get All Subcategories
exports.getAllSubcategories = async (req, res) => {
    try {
        const menus = await Menu.find()
            .select("categories.subcategories")
            .populate({
                path: "categories.subcategories.items",
                select: "-__v",
            })
            .select("-__v");

        let subcategories = [];
        menus.forEach((menu) => {
            menu.categories.forEach((category) => {
                subcategories.push(...category.subcategories);
            });
        });

        res.json({ ok: true, subcategories });
    } catch (error) {
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

// 15. Get All Items
exports.getAllItems = async (req, res) => {
    try {
        const menus = await Menu.find()
            .populate({
                path: "uncategorizedItems",
                model: "Item",
            })
            .populate({
                path: "categories.items",
                model: "Item",
            })
            .populate({
                path: "categories.subcategories.items",
                model: "Item",
            });

        let allItems = [];

        // Process uncategorized items
        menus.forEach((menu) => {
            menu.uncategorizedItems.forEach((item) => {
                allItems.push(Item.findById(item._id).select("-__v").lean());
            });

            // Process items within categories and subcategories
            menu.categories.forEach((category) => {
                category.items.forEach((item) => {
                    allItems.push(Item.findById(item._id).select("-__v").lean());
                });

                category.subcategories.forEach((subcategory) => {
                    subcategory.items.forEach((item) => {
                        allItems.push(Item.findById(item._id).select("-__v").lean());
                    });
                });
            });
        });

        // Execute all promises to get item details
        allItems = await Promise.all(allItems);

        res.status(200).json({
            ok: true,
            items: allItems,
        });
    } catch (error) {
        logger.error("Error fetching admin items:", error);
        res.status(500).json({
            ok: false,
            message: "An error occurred while fetching items",
            error: error.message,
        });
    }
};
