
const express=require("express");
const { getUrl, profileUpdate ,getFiles} = require("./aws.controller");

const router=express.Router();


router.post("/get-presigned-url",getUrl);
router.post("/update-profile-pic",profileUpdate);
router.get('/getfiles',getFiles);

module.exports=router;