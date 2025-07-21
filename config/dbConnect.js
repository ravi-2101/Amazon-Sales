const mongoose = require('mongoose');
require('dotenv').config();

const databaseConnection = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL)
        .then(()=> console.log("Database connected successfully!"))
        .catch((err) => console.log(err))
    } catch (error) {
        console.log("Database connection error : ",error);
    }
}

module.exports = databaseConnection;