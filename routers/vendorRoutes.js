const express = require("express");
const authRouter = require("./authRoutes");
const menuRouter = require("./menuRoutes");
const { vendorOnlyAuth } = require("../middlewares/authMiddleware");
const vendorRouter = express.Router();

vendorRouter.use("/auth", authRouter);
vendorRouter.use("/menu", vendorOnlyAuth, menuRouter);

module.exports = vendorRouter;
