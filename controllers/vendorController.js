// controllers/vendorController.js
const bcrypt = require("bcryptjs");
const { ZodError } = require("zod");
const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor/vendorModel");
const vendorValidationSchema = require("../models/vendor/vendorValidation");
const logger = require("../logger/logger");
const { Menu, Item } = require("../models/menu/menuModel");
const { itemValidationSchema, categoryValidationSchema, subcategoryValidationSchema, menuValidationSchema } = require("../models/menu/menuValidation");
const CacheService = require("../cacheServer");
const cache = new CacheService(60 * 60);
const generateToken = (id) => {
    return jwt.sign({ id, role: "vendor" }, process.env.JWT_SECRET, { expiresIn: "1h" });
};
exports.invalidateVendorCache = (username, email) => {
    const cacheKey = `vendor:${username}:${email}`;
    cache.del(cacheKey);
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

        const cacheKey = `vendor:${username}:${email}`;

        let vendor = cache.get(cacheKey);

        if (!vendor) {
            vendor = await Vendor.findOne({ username, email }).select("+password");
            if (!vendor.isPasswordChanged) {
                const vendorCache = { ...vendor.toObject(), password: undefined, isPasswordChanged: true };
                cache.set(cacheKey, vendorCache);
                return res.status(200).json({
                    ok: false,
                    message: "Please change your password",
                    token: generateToken(vendor._id),
                    requirePasswordChange: true,
                });
            }
            if (vendor) {
                const vendorCache = { ...vendor.toObject(), password: undefined };
                cache.set(cacheKey, vendorCache);
            }
        }

        if (!vendor) {
            return res.status(401).json({ ok: false, message: "Invalid Username or Email" });
        }

        if (!vendor.password) {
            const vendorFromDB = await Vendor.findById(vendor._id).select("+password");
            vendor.password = vendorFromDB.password;
        }

        if (!(await bcrypt.compare(password, vendor.password))) {
            return res.status(401).json({ ok: false, message: "Invalid password" });
        }

        res.json({
            ok: true,
            token: generateToken(vendor._id),
            vendor: {
                username: vendor.username,
                email: vendor.email,
                gstnumber: vendor?.gstnumber,
                theme: vendor.theme,
                phone: vendor.phone,
                address: vendor.address,
                status: vendor.status,
                logo: vendor.logo,
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

        res.json({ ok: true, item });
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
exports.getDashboardCounts = async (req, res) => {
    try {
        const menuCount = await Menu.countDocuments({ vendor: req.vendor._id });

        const categoryCounts = await Menu.aggregate([
            { $match: { vendor: req.vendor._id } },
            { $unwind: "$categories" },
            {
                $group: {
                    _id: null,
                    categoryCount: { $addToSet: "$categories._id" },
                    subcategoryCount: { $addToSet: "$categories.subcategories._id" },
                    itemCount: { $addToSet: "$categories.subcategories.items._id" },
                },
            },
            {
                $project: {
                    _id: 0,
                    categoryCount: { $size: "$categoryCount" },
                    subcategoryCount: {
                        $size: {
                            $reduce: {
                                input: "$subcategoryCount",
                                initialValue: [],
                                in: { $concatArrays: ["$$value", "$$this"] },
                            },
                        },
                    },
                    itemCount: {
                        $size: {
                            $reduce: {
                                input: "$itemCount",
                                initialValue: [],
                                in: { $concatArrays: ["$$value", "$$this"] },
                            },
                        },
                    },
                },
            },
        ]);

        res.json({
            ok: true,
            counts: {
                menus: menuCount,
                categories: categoryCounts[0]?.categoryCount || 0,
                subcategories: categoryCounts[0]?.subcategoryCount || 0,
                items: categoryCounts[0]?.itemCount || 0,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
exports.getVendorMenus = async (req, res) => {
    try {
        const vendorId = req.vendor._id;

        const menus = await Menu.find({ vendor: vendorId }).select("_id type").lean();

        res.status(200).json({
            ok: true,
            menus: menus,
        });
    } catch (error) {
        console.error("Error fetching vendor menus:", error);
        res.status(500).json({
            ok: false,
            message: "An error occurred while fetching menus",
            error: error.message,
        });
    }
};
exports.getVendorCategories = async (req, res) => {
    try {
        const vendorId = req.vendor._id;

        const categories = await Menu.aggregate([
            { $match: { vendor: vendorId } },
            { $unwind: "$categories" },
            {
                $group: {
                    _id: "$categories._id",
                    name: { $first: "$categories.name" },
                    menuId: { $first: "$_id" },
                    menuName: { $first: "$type" },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    menuId: 1,
                    menuName: 1,
                },
            },
        ]);

        res.status(200).json({
            ok: true,
            categories: categories,
        });
    } catch (error) {
        console.error("Error fetching vendor categories:", error);
        res.status(500).json({
            ok: false,
            message: "An error occurred while fetching categories",
            error: error.message,
        });
    }
};
exports.getVendorSubcategories = async (req, res) => {
    try {
        const vendorId = req.vendor._id;

        const subcategories = await Menu.aggregate([
            { $match: { vendor: vendorId } },
            { $unwind: "$categories" },
            { $unwind: "$categories.subcategories" },
            {
                $group: {
                    _id: "$categories.subcategories._id",
                    name: { $first: "$categories.subcategories.name" },
                    categoryId: { $first: "$categories._id" },
                    categoryName: { $first: "$categories.name" },
                    menuId: { $first: "$_id" },
                    menuName: { $first: "$type" },
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    categoryId: 1,
                    categoryName: 1,
                    menuId: 1,
                    menuName: 1,
                },
            },
        ]);

        res.status(200).json({
            ok: true,
            subcategories: subcategories,
        });
    } catch (error) {
        console.error("Error fetching vendor subcategories:", error);
        res.status(500).json({
            ok: false,
            message: "An error occurred while fetching subcategories",
            error: error.message,
        });
    }
};
exports.getVendorItems = async (req, res) => {
    try {
        const vendorId = req.vendor._id;

        // Find all menus for this vendor
        const menus = await Menu.find({ vendor: vendorId })
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

        menus.forEach((menu) => {
            // Add uncategorized items
            allItems = allItems.concat(
                menu.uncategorizedItems.map((item) => ({
                    ...item.toObject(),
                    menuId: menu._id,
                    menuType: menu.type,
                    category: "Uncategorized",
                    subcategory: null,
                }))
            );

            // Add items from categories and subcategories
            menu.categories.forEach((category) => {
                allItems = allItems.concat(
                    category.items.map((item) => ({
                        ...item.toObject(),
                        menuId: menu._id,
                        menuType: menu.type,
                        category: category.name,
                        categoryId: category._id,
                        subcategory: null,
                    }))
                );

                category.subcategories.forEach((subcategory) => {
                    allItems = allItems.concat(
                        subcategory.items.map((item) => ({
                            ...item.toObject(),
                            menuId: menu._id,
                            menuType: menu.type,
                            categoryId: category._id,
                            category: category.name,
                            subcategoryId: subcategory._id,
                            subcategory: subcategory.name,
                        }))
                    );
                });
            });
        });

        res.status(200).json({
            ok: true,
            items: allItems,
        });
    } catch (error) {
        logger.error("Error fetching vendor items:", error);
        res.status(500).json({
            ok: false,
            message: "An error occurred while fetching items",
            error: error.message,
        });
    }
};
// Delete a category
exports.deleteCategory = async (req, res) => {
    try {
        const { menuId, categoryId } = req.params;

        const menu = await Menu.findOne({ _id: menuId, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }

        const categoryIndex = menu.categories.findIndex((cat) => cat._id.toString() === categoryId);
        if (categoryIndex === -1) {
            return res.status(404).json({ ok: false, message: "Category not found" });
        }

        menu.categories.splice(categoryIndex, 1);
        await menu.save();

        res.json({ ok: true, message: "Category deleted successfully" });
    } catch (error) {
        logger.error("Error deleting category:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

// Delete a subcategory
exports.deleteSubcategory = async (req, res) => {
    try {
        const { menuId, categoryId, subcategoryId } = req.params;

        const menu = await Menu.findOne({ _id: menuId, vendor: req.vendor._id });
        if (!menu) {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }

        const category = menu.categories.id(categoryId);
        if (!category) {
            return res.status(404).json({ ok: false, message: "Category not found" });
        }

        const subcategoryIndex = category.subcategories.findIndex((subcat) => subcat._id.toString() === subcategoryId);
        if (subcategoryIndex === -1) {
            return res.status(404).json({ ok: false, message: "Subcategory not found" });
        }

        category.subcategories.splice(subcategoryIndex, 1);
        await menu.save();

        res.json({ ok: true, message: "Subcategory deleted successfully" });
    } catch (error) {
        logger.error("Error deleting subcategory:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

// Delete an item

exports.getAllMenus = async (req, res) => {
    const { vendorId } = req.params;
    try {
        const menus = await Menu.find({ vendor: vendorId });
        res.json({ ok: true, menus: menus });
    } catch (error) {
        logger.error("Error fetching vendor menus:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
exports.deleteVendorItem = async (req, res) => {
    try {
        const { menuId, categoryId, subcategoryId, itemId } = req.params;
        const vendorId = req.vendor._id;
        const menu = await Menu.findOne({ _id: menuId, vendor: vendorId });

        if (menu) {
            const category = menu.categories.find((cat) => cat._id.toString() === categoryId);
            if (category) {
                const subcategory = category.subcategories.find((subcat) => subcat._id.toString() === subcategoryId);
                if (subcategory) {
                    const subcategoryItemIndex = subcategory.items.findIndex((id) => id.toString() === itemId);
                    if (subcategoryItemIndex !== -1) {
                        subcategory.items.splice(subcategoryItemIndex, 1);
                        await menu.save({ validateBeforeSave: false });
                        await Item.findByIdAndDelete(itemId);
                        res.json({ ok: true, message: "Item deleted successfully" });
                    }
                } else {
                    const subcategoryItemIndex = subcategory.items.findIndex((id) => id.toString() === itemId);
                    if (subcategoryItemIndex !== -1) {
                        subcategory.items.splice(subcategoryItemIndex, 1);
                        await menu.save({ validateBeforeSave: false });
                        await Item.findByIdAndDelete(itemId);
                        res.json({ ok: true, message: "Item deleted successfully" });
                    }
                }
            } else {
                const uncategorizedIndex = menu.uncategorizedItems.findIndex((id) => id.toString() === itemId);
                if (uncategorizedIndex !== -1) {
                    menu.uncategorizedItems.splice(uncategorizedIndex, 1);
                    await menu.save({ validateBeforeSave: false });
                    await Item.findByIdAndDelete(itemId);
                    res.json({ ok: true, message: "Item deleted successfully" });
                }
            }
        } else {
            return res.status(404).json({ ok: false, message: "Menu not found" });
        }
    } catch (error) {
        console.error("Error deleting item:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};

exports.fetchItemByCustomer = async (req, res) => {
    try {
        const { itemId } = req.params;

        const item = await Item.findById(itemId);

        if (!item) {
            return res.status(404).json({ ok: false, message: "Item not found" });
        }

        res.status(200).json({ ok: true, item });
    } catch (error) {
        console.error("Error fetching item:", efrror);
        res.status(500).json({ ok: false, message: "Internal server error" });
    }
};
exports.updateItem = async (req, res) => {
    try {
        const { itemId } = req.params;
        const { title, description, price, image, ingredients } = req.body;
        const vendorId = req.vendor._id;

        try {
            await itemValidationSchema.parseAsync({ title, description, price, image, ingredients });
        } catch (zodError) {
            return res.status(400).json({
                ok: false,
                message: "Validation Error, Please check weather you have provided all required value or not, For Eg. Image",
                errors: zodError.errors,
            });
        }

        const item = await Item.findById(itemId);
        if (!item) {
            return res.status(404).json({ ok: false, message: "Item not found" });
        }

        const menuWithItem = await Menu.findOne({
            vendor: vendorId,
            $or: [{ "categories.items": itemId }, { "categories.subcategories.items": itemId }, { uncategorizedItems: itemId }],
        });

        if (!menuWithItem) {
            return res.status(403).json({ ok: false, message: "You don't have permission to update this item" });
        }

        await Item.findByIdAndUpdate(itemId, { title, description, price, image, ingredients }, { new: true, runValidators: true });

        res.json({ ok: true, message: "Item updated successfully" });
    } catch (error) {
        console.error("Error updating item:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
