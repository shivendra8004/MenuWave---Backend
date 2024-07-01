const { z } = require("zod");

const adminValidationSchema = z.object({
    username: z.string().min(6, { message: "Username must be at least 6 characters long" }).max(50, { message: "Username must not exceed 50 characters" }),

    email: z.string().email({ message: "Invalid email address" }),

    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters long" })
        .max(100, { message: "Password must not exceed 100 characters" })
        .refine(
            (password) => {
                const numberCount = (password.match(/\d/g) || []).length;
                const specialCharCount = (password.match(/[!@#$%^&*(),.?":{}|<>]/g) || []).length;
                return numberCount >= 2 && specialCharCount >= 1;
            },
            {
                message: "Password must contain at least 2 numbers and 1 special character",
            }
        ),

    isInitialAdmin: z.boolean().optional(),
    isPasswordChanged: z.boolean().optional(),
});

module.exports = adminValidationSchema;
