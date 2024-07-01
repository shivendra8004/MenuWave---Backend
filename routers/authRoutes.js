const express = require("express");
const { createInitialAdmin, adminLogin, changePassword, createAdmin } = require("../controllers/adminController");
const { protectAuth, adminOnlyAuth } = require("../middlewares/authMiddleware");
const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
    res.status(200).json({ ok: true, message: "Auth route works!" });
});
authRouter.post("/initialAdmin", createInitialAdmin);
authRouter.post("/adminLogin", adminLogin);
authRouter.post("/changePassword", protectAuth, changePassword);
authRouter.post("/create/admin", adminOnlyAuth, createAdmin);
module.exports = authRouter;
