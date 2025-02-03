const express = require("express");
const { addfiles, getFiles, getNotify, mark } = require("./import.controller");
const decryptPayload = require("../../middlewares/decrypt");
const authenticateToken = require("../../middlewares/authenticateToken");
const importrouter = express.Router();

importrouter.post("/add", decryptPayload, addfiles);
importrouter.get("/files/:id", authenticateToken, decryptPayload, getFiles);
importrouter.get(
  "/getNotifications",
  authenticateToken,
  decryptPayload,
  getNotify
);
importrouter.post("/markAsRead", authenticateToken, decryptPayload, mark);
module.exports = importrouter;
