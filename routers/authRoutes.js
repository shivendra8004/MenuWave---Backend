const express = require("express");
const { adminLogin, changePassword } = require("../controllers/adminController");
const { protectAuth } = require("../middlewares/authMiddleware");
const { vendorLogin } = require("../controllers/vendorController");
const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
    res.status(200).json({ ok: true, message: "Auth route works!" });
});
authRouter.post("/adminLogin", adminLogin);
authRouter.post("/changePassword", protectAuth, changePassword);
authRouter.post("/vendorLogin", vendorLogin);
module.exports = authRouter;
