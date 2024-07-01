const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const logger = require("./logger/logger");
const connectDatabase = require("./database/db");
const authRouter = require("./routers/authRoutes");
const app = express();
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
});
dotenv.config();

// Middleware
app.use(limiter);
app.use(helmet());
app.use(express.json());
app.use(compression());

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL,
        optionsSuccessStatus: 200,
    })
);
// Morgan
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
} else {
    app.use(morgan("combined"));
}
// Handling any unknown error
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).send("Something broke!");
});

// Routes
app.use("/v1/api/auth", authRouter);
app.get("/", (req, res) => {
    res.status(200).json({ ok: true, message: "Welcome to the server!" });
});

// Connect to the database
connectDatabase().catch((error) => logger.error("Error connecting to the database: ", error));

// Start the server
const PORT = process.env.PORT || 5500;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
