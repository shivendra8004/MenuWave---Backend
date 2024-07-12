const { z } = require("zod");

const vendorValidationSchema = z.object({
    username: z.string().min(2, { message: "Username must be at least 2 characters long" }).max(100, { message: "Username must not exceed 100 characters" }),
    role: z.string().default("vendor"),
    email: z.string().email({ message: "Invalid email address" }),
    logo: z.string().url({ message: "Invalid URL" }),
    cin: z
        .string()
        .length(21, { message: "CIN must be exactly 21 characters long" })
        .regex(/^[A-Z]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, { message: "Invalid CIN format" }),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: "Invalid phone number" }),
    address: z.string().min(5, { message: "Address must be at least 5 characters long" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
    status: z.enum(["active", "disabled"]).optional(),
    isPasswordChanged: z.boolean().optional(),
});

module.exports = vendorValidationSchema;
