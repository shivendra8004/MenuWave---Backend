const express = require("express");
const adminRouter = express.Router();
const { adminOnlyAuth } = require("../middlewares/authMiddleware");
const { createInitialAdmin, createAdmin, createVendor, updateVendor, getAllVendors } = require("../controllers/adminController");
const authRouter = require("./authRoutes");

adminRouter.post("/initialAdmin", createInitialAdmin);
adminRouter.post("/create/admin", adminOnlyAuth, createAdmin);
adminRouter.post("/create/vendor", adminOnlyAuth, createVendor);
adminRouter.put("/update/vendor/:id", adminOnlyAuth, updateVendor);
adminRouter.get("/getAllVendors", adminOnlyAuth, getAllVendors);
adminRouter.use("/auth", authRouter);

module.exports = adminRouter;
