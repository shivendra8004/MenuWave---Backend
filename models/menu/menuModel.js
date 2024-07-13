const mongoose = require("mongoose");
const { itemValidationSchema, subcategoryValidationSchema, categoryValidationSchema, menuValidationSchema } = require("./menuValidation");

const ItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    ingredients: [{ type: String, required: true }],
});

ItemSchema.pre("validate", function (next) {
    try {
        itemValidationSchema.parse(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

const SubcategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
});

SubcategorySchema.pre("validate", function (next) {
    try {
        subcategoryValidationSchema.parse(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    subcategories: [SubcategorySchema],
    items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
});

CategorySchema.pre("validate", function (next) {
    try {
        categoryValidationSchema.parse(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

const MenuSchema = new mongoose.Schema(
    {
        vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
        type: { type: String, enum: ["Dine In", "Take Away", "Delivery", "Room Service"], required: true },
        categories: [CategorySchema],
        uncategorizedItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
    },
    { timestamps: true }
);

MenuSchema.pre("validate", function (next) {
    try {
        const menuObj = this.toObject();
        menuObj.vendor = menuObj.vendor.toString();
        menuObj.uncategorizedItems = menuObj.uncategorizedItems.map((id) => id.toString());
        menuObj.categories = menuObj.categories.map((category) => ({
            ...category,
            items: category.items.map((id) => id.toString()),
            subcategories: category.subcategories.map((subcategory) => ({
                ...subcategory,
                items: subcategory.items.map((id) => id.toString()),
            })),
        }));

        menuValidationSchema.parse(menuObj);
        next();
    } catch (error) {
        next(error);
    }
});

const Item = mongoose.model("Item", ItemSchema);
const Menu = mongoose.model("Menu", MenuSchema);

module.exports = { Menu, Item };
