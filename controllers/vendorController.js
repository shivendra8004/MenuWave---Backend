// controllers/vendorController.js
const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor/vendorModel");
const vendorValidationSchema = require("../models/vendor/vendorValidation");
const logger = require("../logger/logger");
const { Menu, Item } = require("../models/menu/menuModel");
const { itemValidationSchema, categoryValidationSchema, subcategoryValidationSchema, menuValidationSchema } = require("../models/menu/menuValidation");

const generateToken = (id) => {
    return jwt.sign({ id, role: "vendor" }, process.env.JWT_SECRET, { expiresIn: "15m" });
};

// Vendor Login
exports.vendorLogin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        try {
            vendorValidationSchema.pick({ username: true, email: true }).parse({ username, email });
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
            return res.status(401).json({ ok: false, message: "Invalid Username or Email" });
        }
        if (!(await bcrypt.compare(password, vendor.password))) {
            return res.status(401).json({ ok: false, message: "Invalid password" });
        }
        if (!vendor.isPasswordChanged) {
            return res.status(200).json({
                ok: false,
                message: "Please change your password",
                token: generateToken(vendor._id),
                requirePasswordChange: true,
            });
        }

        res.json({
            ok: true,
            token: generateToken(vendor._id),
            vendor: {
                username: vendor.username,
                email: vendor.email,
                cin: vendor.cin,
                phone: vendor.phone,
                address: vendor.address,
                status: vendor.status,
                creationDate: vendor.createdAt,
            },
        });
    } catch (error) {
        logger.error("Error in vendor login:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
exports.createMenu = async (req, res) => {
    try {
        const { type } = req.body;
        const vendorId = req.vendor._id.toString();
        const menuData = {
            vendor: vendorId,
            type,
        };

        await menuValidationSchema.parseAsync(menuData);

        const menu = new Menu({
            vendor: vendorId,
            type: type.toString(),
        });
        await menu.save();
        res.status(201).json({ ok: true, menu });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        logger.error("Error creating menu:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const { menuId } = req.params;
        const { name } = req.body;

        await categoryValidationSchema.parseAsync({ name });

        const menu = await Menu.findOne({ _id: menuId, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }
        menu.categories.push({ name, subcategories: [], items: [] });
        await menu.save();
        res.json({ ok: true, menu });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        logger.error("Error adding category:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.addSubcategory = async (req, res) => {
    try {
        const { menuId, categoryId } = req.params;
        const { name } = req.body;

        await subcategoryValidationSchema.parseAsync({ name });

        const menu = await Menu.findOne({ _id: menuId, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }
        const category = menu.categories.id(categoryId);
        if (!category) {
            return res.status(404).json({ ok: false, message: "Category not found" });
        }
        category.subcategories.push({ name, items: [] });
        await menu.save();
        res.json({ ok: true, menu });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        logger.error("Error adding subcategory:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.addItem = async (req, res) => {
    try {
        const { menuId, categoryId, subcategoryId } = req.params;
        const { title, description, price, image, ingredients } = req.body;

        // Validate item data
        await itemValidationSchema.parseAsync({ title, description, price, image, ingredients });

        // Find the menu
        const menu = await Menu.findOne({ _id: menuId, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }

        // Create and save the new item
        const item = new Item({ title, description, price, image, ingredients });
        await item.save();

        // Add item to the appropriate place in the menu
        if (!categoryId) {
            menu.uncategorizedItems.push(item._id);
        } else {
            const category = menu.categories.id(categoryId);
            if (!category) {
                return res.status(404).json({ ok: false, message: "Category not found" });
            }
            if (!subcategoryId) {
                category.items.push(item._id);
            } else {
                const subcategory = category.subcategories.id(subcategoryId);
                if (!subcategory) {
                    return res.status(404).json({ ok: false, message: "Subcategory not found" });
                }
                subcategory.items.push(item._id);
            }
        }

        // Save the menu without triggering validation
        await menu.save({ validateBeforeSave: false });

        // Fetch the updated menu
        const updatedMenu = await Menu.findById(menuId).lean();

        res.json({ ok: true, menu: updatedMenu, item });
    } catch (error) {
        if (error instanceof ZodError) {
            console.log("Validation error:", JSON.stringify(error.errors, null, 2));
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        console.error("Error adding item:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.getVendorMenus = async (req, res) => {
    const { vendorId } = req.params;
    try {
        const menus = await Menu.find({ vendor: vendorId }).populate({
            path: "categories.items categories.subcategories.items uncategorizedItems",
            model: "Item",
        });
        res.json({ ok: true, menus });
    } catch (error) {
        logger.error("Error fetching vendor menus:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.updateMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const { type, categories, uncategorizedItems } = req.body;

        const menu = await Menu.findOneAndUpdate(
            { _id: id, vendor: req.vendor._id },
            { type, categories, uncategorizedItems },
            { new: true, runValidators: true }
        );

        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }

        res.json({ ok: true, menu });
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        logger.error("Error updating menu:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.deleteMenu = async (req, res) => {
    try {
        const { id } = req.params;
        const menu = await Menu.findOneAndDelete({ _id: id, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }
        res.json({ ok: true, message: "Menu deleted successfully" });
    } catch (error) {
        logger.error("Error deleting menu:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.getPublicMenu = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const menus = await Menu.find({ vendor: vendorId }).populate({
            path: "categories.items categories.subcategories.items uncategorizedItems",
            model: "Item",
        });
        res.json({ ok: true, menus });
    } catch (error) {
        logger.error("Error fetching public menu:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
// change vendor password
exports.changeVendorPasswordByVendor = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Validate new password
        try {
            vendorValidationSchema.pick({ password: true }).parse({ password: newPassword });
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

        const vendor = await Vendor.findById(req.vendor.id);
        if (!vendor) {
            return res.status(404).json({ ok: false, message: "Vendor not found" });
        }

        if (!(await bcrypt.compare(currentPassword, vendor.password))) {
            return res.status(401).json({ ok: false, message: "Current password is incorrect" });
        }

        vendor.password = await bcrypt.hash(newPassword, 12);
        vendor.isPasswordChanged = true;
        await vendor.save();

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
