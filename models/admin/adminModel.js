const mongoose = require("mongoose");
const adminValidationSchema = require("./adminValidation");

const AdminSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            minlength: 6,
            maxlength: 50,
        },
        role: {
            type: String,
            default: "admin",
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        password: {
            type: String,
            required: true,
        },
        isInitialAdmin: {
            type: Boolean,
            default: false,
        },
        isPasswordChanged: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Zod validation middleware
AdminSchema.pre("validate", function (next) {
    try {
        adminValidationSchema.parse(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Admin", AdminSchema);
