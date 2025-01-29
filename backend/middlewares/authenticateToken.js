const jwt = require("jsonwebtoken");
const knex = require("knex");
const { Model } = require("objection");
const knexConfig = require("./../knexfile");
const db = knex(knexConfig);
Model.knex(db);
const JWT_SECRET = "AkriviaHCM";
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "access token req" });
  }
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(401).json({ message: "invalid Toknn" });
    }
    const user1 = await db("users").where({ user_id: user.user_id }).first();
    if (!user1) return res.status(401).json({ message: "invalid token" });
    req.user = user1;
    next();
  });
};

module.exports = authenticateToken;
