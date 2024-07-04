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
            token = req.headers.authorization.split(" ")[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await Admin.findById(decoded.id).select("-password");
            console.log("Middleware User:", req.user.role);
            if (!req.user || req.user.role !== "admin") {
                return res.status(401).json({ ok: false, message: "Not authorized, admin only" });
            }

            next();
        } catch (error) {
            console.error("Error in auth middleware:", error);
            res.status(401).json({ ok: false, message: "Not authorized, token failed" });
        }
    } else {
        res.status(401).json({ ok: false, message: "Not authorized, no token" });
    }
};
