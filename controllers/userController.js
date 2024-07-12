const jwt = require("jsonwebtoken");
const Vendor = require("../models/vendor/vendorModel");
const logger = require("../logger/logger");

// Vendor Details
exports.vendorDetails = async (req, res) => {
    try {
        const { vendorId } = req.params;
        const vendor = await Vendor.findById(vendorId);
        if (!vendor) {
            return res.status(401).json({ ok: false, message: "There is no vendor with this id" });
        }

        res.json({
            ok: true,
            vendor: {
                username: vendor.username,
                logo: vendor.logo,
            },
        });
    } catch (error) {
        logger.error("Error in vendor login:", error);
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
