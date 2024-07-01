const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

async function connectDatabase() {
    try {
        console.log("Connecting to the database...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.log("Error connecting to the database: ", error);
    }
}

module.exports = connectDatabase;
