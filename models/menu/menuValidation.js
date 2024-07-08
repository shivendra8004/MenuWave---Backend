const mongoose = require("mongoose");
const { z } = require("zod");

const itemValidationSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }).max(100, { message: "Title must not exceed 100 characters" }),
    description: z.string().max(500, { message: "Description must not exceed 500 characters" }).optional(),
    price: z.number().positive({ message: "Price must be a positive number" }),
    image: z.string().url({ message: "Invalid image URL" }).optional(),
    ingredients: z.array(z.string()).optional(),
});

const subcategoryValidationSchema = z.object({
    name: z.string().min(1, { message: "Subcategory name is required" }).max(50, { message: "Subcategory name must not exceed 50 characters" }),
    items: z.array(z.string()).optional(), // Array of item IDs
});

const categoryValidationSchema = z.object({
    name: z.string().min(1, { message: "Category name is required" }).max(50, { message: "Category name must not exceed 50 characters" }),
    subcategories: z.array(subcategoryValidationSchema).optional(),
    items: z.array(z.string()).optional(), // Array of item IDs
});
const objectIdValidation = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
    message: "Invalid ObjectId",
});
const menuValidationSchema = z.object({
    vendor: objectIdValidation,
    type: z.enum(["Dine In", "Take Away", "Delivery"]),
    categories: z
        .array(
            z.object({
                name: z.string(),
                subcategories: z.array(
                    z.object({
                        name: z.string(),
                        items: z.array(objectIdValidation),
                    })
                ),
                items: z.array(objectIdValidation),
            })
        )
        .optional(),
    uncategorizedItems: z.array(objectIdValidation).optional(),
});

module.exports = {
    itemValidationSchema,
    subcategoryValidationSchema,
    categoryValidationSchema,
    menuValidationSchema,
};
