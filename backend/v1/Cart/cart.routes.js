const express = require("express");
const {
  createProductCart,
  getData,
  deleteProductCard,
} = require("./cart.controller");
const authenticateToken = require("../../middlewares/authenticateToken");
const decryptPayload = require("../../middlewares/decrypt");
const cartrouter = express.Router();

cartrouter.post(
  "/create",
  authenticateToken,
  decryptPayload,
  createProductCart
);
cartrouter.get("/getdata/:id", decryptPayload, getData);
cartrouter.delete(
  "/delete/:id",
  authenticateToken,
  decryptPayload,
  deleteProductCard
);

module.exports = cartrouter;
