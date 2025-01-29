const express = require("express");
const {
  CreateUser,
  loginUser,
  RefreshToken,
  sendEmail,
  resetPass,
} = require("./auth.controller");
const router = express.Router();
const encryptPayload = require("./../../middlewares/encrypt");
const decryptPayload = require("./../../middlewares/decrypt");

router.post("/signup", decryptPayload, CreateUser);

router.post("/login", decryptPayload, loginUser);
router.post("/refresh", decryptPayload, RefreshToken);
router.post("/send-email", decryptPayload, sendEmail);
router.post("/reset-password", decryptPayload, resetPass);

module.exports = router;


