const express=require('express');
const {updateUser, deleteUser, getAllUsers,getUser } = require('./user.controller');
const authenticateToken = require('../../middlewares/authenticateToken');
const decryptPayload = require('../../middlewares/decrypt');
const router=express.Router();

router.get('/userdata',decryptPayload,authenticateToken,getUser);
router.put('/update/:id', updateUser)

router.delete('/delete/:id', deleteUser);

router.get('/getAll',decryptPayload,authenticateToken, getAllUsers);

module.exports = router;

