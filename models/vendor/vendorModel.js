const mongoose = require("mongoose");
const vendorValidationSchema = require("./vendorValidation");

const VendorSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            minlength: 2,
            maxlength: 100,
        },
        role: {
            type: String,
            default: "vendor",
            required: true,
        },
        isPasswordChanged: {
            type: Boolean,
            default: false,
        },
        email: {
            type: String,
            required: true,
            unique: true,
        },
        cin: {
            type: String,
            required: true,
            unique: true,
            length: 21,
        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        password: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            enum: ["active", "disabled"],
            default: "active",
        },
    },
    {
        timestamps: true,
    }
);

// Zod validation middleware
VendorSchema.pre("validate", function (next) {
    try {
        vendorValidationSchema.parse(this.toObject());
        next();
    } catch (error) {
        next(error);
    }
});

module.exports = mongoose.model("Vendor", VendorSchema);
