const knex = require("knex");
const knexConfig = require("./../../knexfile");
const CustomError = require("./../../utils/CustomError");
const asyncErrorHandler = require("./../../utils/asyncErrorHandler");
const encryptData = require("./../../middlewares/encrypt");
const db = knex(knexConfig);

getPendingFiles = asyncErrorHandler(async (req, res) => {});

const addfiles = asyncErrorHandler(async (req, res, next) => {
  //console.log(req.body);
  const { user_id, filename } = req.body;
  if (!user_id || !filename) {
    return next(CustomError("Regquired fields missing", 404));
  }

  // const existingFile = await db("import_files")
  //   .where({ user_id: user_id, filename: filename })
  //   .first();
  // if (existingFile) {
  //   return next(CustomError("This file was already uploaded", 400));
  // }

  const fileUrl = `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/importedfiles/${filename}`;
  const [response] = await db("import_files").insert({
    user_id: user_id,
    filename: filename,
    fileurl: fileUrl,
  });
  if (!response) {
    return next(CustomError("Error in inserting data", 400));
  }
  res.status(201).json(encryptData({ message: "Data Inserted Successfully" }));
  console.log("data", response);
});
const getFiles = asyncErrorHandler(async (req, res) => {
  const id = req.user.user_id;
  //console.log("user", id);
  const files = await db("import_files").select("*").where({ user_id: id });
  //console.log(files);
  res.json(encryptData({ files }));
});

const getNotify = asyncErrorHandler(async (req, res, next) => {
  const id = req.user.user_id;
  try {
    const notifications = await db("notifications")
      .where("user_id", id)
      .andWhere("status", "unread")
      .orderBy("created_at", "desc");

    res.json(encryptData(notifications));
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json(encryptData({ error: "Internal Server Error" }));
  }
});

const mark = asyncErrorHandler(async (req, res, next) => {
  const id = req.user.user_id;
  try {
    await db("notifications")
      .where("user_id", id)
      .andWhere("status", "unread")
      .update({ status: "read" });

    res.json(encryptData({ message: "Notifications marked as read" }));
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json(encryptData({ error: "Internal Server Error" }));
  }
});

module.exports = { addfiles, getFiles, getNotify, mark };
