const express = require("express");
const authRouter = require("./authRoutes");
const vendorRouter = express.Router();
vendorRouter.use("/auth", authRouter);
module.exports = vendorRouter;
