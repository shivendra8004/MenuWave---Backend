const express = require("express");
const adminRouter = express.Router();
const { adminOnlyAuth } = require("../middlewares/authMiddleware");
const {
    createInitialAdmin,
    createAdmin,
    createVendor,
    updateVendor,
    getAllVendors,
    deleteAdmin,
    deleteVendor,
    getAllAdmins,
    getDashboardStats,
    getAllCategories,
    getAllSubcategories,
    getAllItems,
} = require("../controllers/adminController");
const authRouter = require("./authRoutes");

// adminRouter.post("/initialAdmin", createInitialAdmin);
adminRouter.post("/create/admin", adminOnlyAuth, createAdmin);
adminRouter.get("/getAllAdmin", adminOnlyAuth, getAllAdmins);
adminRouter.get("/getDashboardData", adminOnlyAuth, getDashboardStats);
adminRouter.post("/create/vendor", adminOnlyAuth, createVendor);
adminRouter.put("/update/vendor/:id", adminOnlyAuth, updateVendor);
adminRouter.get("/getAllVendors", adminOnlyAuth, getAllVendors);
adminRouter.delete("/delete/admin/:id", adminOnlyAuth, deleteAdmin);
adminRouter.delete("/delete/vendor/:id", adminOnlyAuth, deleteVendor);
adminRouter.get("/getAllCategories", adminOnlyAuth, getAllCategories);
adminRouter.get("/getAllSubCategories", adminOnlyAuth, getAllSubcategories);
adminRouter.get("/getAllItems", adminOnlyAuth, getAllItems);
adminRouter.use("/auth", authRouter);

module.exports = adminRouter;
