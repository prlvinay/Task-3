const express = require("express");
const dashboard = express.Router();
const vendor = require("./vendor.controller");
const categories = require("./categories");
const {
  updateimage,
  postproduct,
  deleteProduct,
  getAllProducts1,
  putproduct,
} = require("./product.controller");
const authenticateToken = require("../../middlewares/authenticateToken");
const decryptPayload = require("../../middlewares/decrypt");

dashboard.get("/vendor", decryptPayload, authenticateToken, vendor);
dashboard.get("/categories", decryptPayload, authenticateToken, categories);
dashboard.post("/product", decryptPayload, postproduct);
//dashboard.get("/product",getproduct);
dashboard.put(
  "/product/updateimage",
  decryptPayload,
  authenticateToken,
  updateimage
);
dashboard.delete(
  "/product/:productId",
  decryptPayload,
  authenticateToken,
  deleteProduct
);
dashboard.get(
  "/filterProduct",
  decryptPayload,
  authenticateToken,
  getAllProducts1
);
dashboard.put("/products", decryptPayload, authenticateToken, putproduct);

module.exports = dashboard;
