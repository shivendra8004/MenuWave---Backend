const express = require("express");
const authRouter = require("./authRoutes");
const menuRouter = require("./menuRoutes");
const { vendorOnlyAuth } = require("../middlewares/authMiddleware");
const {
    getDashboardCounts,
    getVendorMenus,
    getVendorCategories,
    getVendorSubcategories,
    getVendorItems,
    getAllMenus,
    fetchItemByCustomer,
} = require("../controllers/vendorController");
const { vendorDetails } = require("../controllers/userController");
const vendorRouter = express.Router();
vendorRouter.get("/getDashboardData", vendorOnlyAuth, getDashboardCounts);
vendorRouter.get("/getVendorMenus", vendorOnlyAuth, getVendorMenus);
vendorRouter.get("/getVendorCategories", vendorOnlyAuth, getVendorCategories);
vendorRouter.get("/getVendorSubCategories", vendorOnlyAuth, getVendorSubcategories);
vendorRouter.get("/getVendorItems", vendorOnlyAuth, getVendorItems);
vendorRouter.use("/auth", authRouter);
vendorRouter.use("/menu", vendorOnlyAuth, menuRouter);
vendorRouter.get("/:vendorId/all", getAllMenus);
vendorRouter.get("/item/:itemId", fetchItemByCustomer);
vendorRouter.get("/:vendorId", vendorDetails);

module.exports = vendorRouter;
