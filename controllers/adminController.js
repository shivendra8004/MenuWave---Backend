const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin/adminModel");

const generateToken = (id) => {
    return jwt.sign({ id, role: "admin" }, process.env.JWT_SECRET, { expiresIn: "1h" });
};

exports.createInitialAdmin = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const existingAdmin = await Admin.findOne({ isInitialAdmin: true });
        if (existingAdmin) {
            return res.status(400).json({ ok: true, message: "Initial admin already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const admin = new Admin({
            username,
            email,
            password: hashedPassword,
            isInitialAdmin: true,
        });

        await admin.save();

        res.status(201).json({ ok: false, message: "Initial admin created successfully" });
    } catch (error) {
        if (error.name === "ValidationError") {
            return res.status(400).json({ ok: false, message: "Validation error", errors: error.errors });
        }
        res.status(500).json({ ok: false, message: "Server error", error: error.message });
    }
};
