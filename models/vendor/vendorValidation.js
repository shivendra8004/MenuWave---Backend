const { z } = require("zod");

const vendorValidationSchema = z.object({
    username: z.string().min(2, { message: "Username must be at least 2 characters long" }).max(100, { message: "Username must not exceed 100 characters" }),
    role: z.string().default("vendor"),
    email: z.string().email({ message: "Invalid email address" }),
    logo: z.string().url({ message: "Invalid URL" }),
    gstNumber: z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, { message: "Invalid gst number" })
        .optional(),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number" }),
    address: z.string().min(5, { message: "Address must be at least 5 characters long" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    status: z.enum(["active", "disabled"]).optional(),
    theme: z.string(),
    isPasswordChanged: z.boolean().optional(),
});

module.exports = vendorValidationSchema;
