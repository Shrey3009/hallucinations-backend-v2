// db.js
const mongoose = require("mongoose");

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log(
      "Connecting to MongoDB:",
      uri ? "URI defined" : "MISSING MONGO_URI/MONGODB_URI!"
    );

    if (!uri) {
      throw new Error("MongoDB URI is missing in environment variables");
    }

    cached.promise = mongoose
      .connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
      })
      .then((mongoose) => {
        console.log("✅ MongoDB connected");
        return mongoose;
      })
      .catch((err) => {
        console.error("❌ MongoDB connection error:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

module.exports = connectDB;
