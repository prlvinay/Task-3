
const knex = require("knex");
const { Model } = require("objection");
const knexConfig = require("./../../knexfile");
const jwt = require("jsonwebtoken");
const encryptData = require("../../middlewares/encrypt");
const db = knex(knexConfig);
Model.knex(db);
const categories = async (req, res) => {
  const data = await db("categories").select("category_name", "category_id");
  res.status(200).json(encryptData({
    data: data,
  }));
};
module.exports = categories;



