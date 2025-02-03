const AWS = require("aws-sdk");
const knex = require("knex");
const { Model } = require("objection");
const knexConfig = require("./../../knexfile");
const db = knex(knexConfig);
Model.knex(db);
require("dotenv").config();

AWS.config.update({
  accessKeyId: process.env.AWS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: "ap-south-1",
});

const s3 = new AWS.S3();

const getUrl = async (req, res) => {
  let { fileName, fileType, userId, folderName } = req.body;
  try {
    if (!fileName || !fileType) {
      return res.status(400).json({ message: "Missing fileName or fileType" });
    }
    // if(userId==='files'){
    //   folderName='fileuploads';
    // }
    // else{
    //   folderName='profile-photos';
    // }
    // console.log(fileName)

    const s3Params = {
      Bucket: "akv-interns",
      Key: `vinay@AKV0793/${folderName}/${fileName}`,
      Expires: 60 * 60,
    };
    s3.getSignedUrl("putObject", s3Params, (err, url) => {
      if (err) {
        return res
          .status(500)
          .json({ error: "Error generating presigned URL" });
      }
      console.log("generated successfully");
      console.log(url);
      res.json({
        presignedUrl: url,
        fileName,
        userId,
        imageUrl: `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/${folderName}/${fileName}`,
      });
    });
  } catch (err) {
    console.error("Error occured in generating presigned url", err);
    res
      .status(500)
      .json({ message: "Error occured in generating presigned url" });
  }
};
// `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/profile-photos/${fileName}`

const profileUpdate = async (req, res) => {
  const { userId, fileName } = req.body;
  const fileUrl = `https://akv-interns.s3.ap-south-1.amazonaws.com/vinay@AKV0793/profile-photos/${fileName}`;

  try {
    console.log(userId);
    await db("users").where("user_id", userId).update({ profile_pic: fileUrl });
    console.log(fileUrl);
    res.json({ message: "Profile picture updated successfully", fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error updating profile picture" });
  }
};

const getFiles = async (req, res) => {
  const params = {
    Bucket: "akv-interns",
    Prefix: "vinay@AKV0793/fileuploads/",
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error("Error fetching files from S3:", err);
      return res.status(500).json({ message: "Error fetching files from S3" });
    }
    const files = data.Contents.map((file) => {
      const fileName = file.Key.replace("vinay@AKV0793/fileuploads/", "");
      return {
        fileName: fileName,
        fileSize: file.Size,
        fileType: __filename.split(".").pop(),
      };
    });

    res.json(files);
  });
};
module.exports = { getUrl, profileUpdate, getFiles };
