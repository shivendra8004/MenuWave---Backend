const express = require("express");
const { adminLogin, changePassword, changeVendorPassword } = require("../controllers/adminController");
const { protectAuth, adminOnlyAuth, vendorOnlyAuth } = require("../middlewares/authMiddleware");
const { vendorLogin, changeVendorPasswordByVendor } = require("../controllers/vendorController");
const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
    res.status(200).json({ ok: true, message: "Auth route works!" });
});
authRouter.post("/adminLogin", adminLogin);
authRouter.post("/vendorLogin", vendorLogin);
authRouter.post("/changePassword", protectAuth, changePassword);
authRouter.put("/vendor/changePassword/:id", adminOnlyAuth, changeVendorPassword);
authRouter.post("/changeVendorPassword", vendorOnlyAuth, changeVendorPasswordByVendor);
module.exports = authRouter;
