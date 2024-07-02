const jwt = require("jsonwebtoken");
const Admin = require("../models/admin/adminModel");
const logger = require("../logger/logger");

exports.protectAuth = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get admin from the token
            req.user = await Admin.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ ok: false, message: "Not authorized, token failed" });
            }

            next();
        } catch (error) {
            logger.error("Error in auth middleware:", error);
            res.status(401).json({ ok: false, message: "Not authorized, token failed" });
        }
    } else if (!token) {
        res.status(401).json({ ok: false, message: "Not authorized, no token" });
    }
};

exports.adminOnlyAuth = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        try {
            // Get token from header
            token = req.headers.authorization.split(" ")[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get admin from the token
            req.user = await Admin.findById(decoded.id).select("-password");

            if (!req.user) {
                return res.status(401).json({ ok: false, message: "Not authorized, no user found" });
            }

            try {
                const admin = await Admin.findById(req.user._id);
                if (admin) {
                    next();
                } else {
                    res.status(403).json({ ok: false, message: "Access denied. Admin only." });
                }
            } catch (error) {
                logger.error("Error in adminOnly middleware:", error);
                res.status(500).json({ ok: false, message: "Server error" });
            }
        } catch (error) {
            logger.error("Error in auth middleware:", error);
            res.status(401).json({ ok: false, message: "Not authorized, token failed" });
        }
    } else if (!token) {
        res.status(401).json({ ok: false, message: "Not authorized, no token" });
    }
};
