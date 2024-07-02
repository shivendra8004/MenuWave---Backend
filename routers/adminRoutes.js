const express = require("express");
const adminRouter = express.Router();
const { adminOnlyAuth } = require("../middlewares/authMiddleware");
const { createInitialAdmin, createAdmin, createVendor, updateVendor } = require("../controllers/adminController");
const authRouter = require("./authRoutes");

adminRouter.post("/initialAdmin", createInitialAdmin);
adminRouter.post("/create/admin", adminOnlyAuth, createAdmin);
adminRouter.post("/create/vendor", adminOnlyAuth, createVendor);
adminRouter.put("/update/vendor/:id", adminOnlyAuth, updateVendor);
adminRouter.use("/auth", authRouter);

module.exports = adminRouter;
