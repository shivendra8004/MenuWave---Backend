const express = require("express");
const { createInitialAdmin } = require("../controllers/adminController");
const authRouter = express.Router();

authRouter.get("/test", (req, res) => {
    res.status(200).json({ ok: true, message: "Auth route works!" });
});
authRouter.post("/initialAdmin", createInitialAdmin);
module.exports = authRouter;
