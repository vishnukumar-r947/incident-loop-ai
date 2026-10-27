const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
    },
    picture: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      enum: ["Admin", "Commander", "Analyst"],
      default: "Commander",
    },
    title: {
      type: String,
      default: "Site Reliability Engineer",
    },
    avatar: {
      type: String,
      default: "IL",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
