/**
 * Script to create the first admin user
 * Run with: node scripts/create-admin.js
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && !key.startsWith("#") && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

// Remove replicaSet requirement for initial setup
const mongoUri = envVars.MONGODB_URI.replace("?replicaSet=erpDevRs", "");
process.env.MONGODB_URI = mongoUri;

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    phone: { type: String },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "staff"], default: "staff" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.models.User || mongoose.model("User", userSchema);

async function createAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully");

    const userCount = await User.countDocuments();
    console.log(`Current user count: ${userCount}`);

    if (userCount > 0) {
      console.log("Users already exist. First user creation skipped.");
      process.exit(0);
    }

    const admin = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "admin@example.com",
      password: "admin123",
      phone: "0771234567",
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
    console.log(`Email: ${admin.email}`);
    console.log(`Password: admin123`);
    console.log(`Role: ${admin.role}`);
    console.log("\nYou can now login at http://localhost:3000/login");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
