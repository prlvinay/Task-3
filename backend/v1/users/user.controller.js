const bcrypt = require('bcryptjs');
const knex=require('knex');
const jwt = require('jsonwebtoken');
const {Model}=require('objection');
const knexConfig=require('./../../knexfile');
const asyncErrorHandler = require('../../utils/asyncErrorHandler');
const CustomError = require('../../utils/CustomError');
const encryptData = require('../../middlewares/encrypt');
const db=knex(knexConfig);
Model.knex(db);   
const getUser= asyncErrorHandler( async (req, res) => {
  try {
    const userId = req.user.user_id;
    const user = await db('users').where({ user_id: userId }).first();  

    if (!user) {
      //return res.status(404).send('User not found');
      return next(CustomError( `User Not found`,404));
    }
    const data={
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      profilePic: user.profile_pic,
      thumbnail:user.thumbnail
    }
    res.json(encryptData(data));
  } catch (err) {
    console.error(err);
    return next(CustomError( `Server error`,404));
  }
});
const updateUser=asyncErrorHandler( async (req, res) => {
  const userId = req.params.id;
  const { first_name, last_name, email, password, profile_pic, thumbnail } = req.body;

  try {
    const user = await db('users').where({ user_id: userId }).first();
    if (!user) {
      return next(CustomError( `User Not found`,404));
    }


    let updatedFields = { first_name, last_name, email, profile_pic, thumbnail };

    if (password) {
      updatedFields.password = await bcrypt.hash(password, 10);
    }


    await db('users').where({ user_id: userId }).update(updatedFields);

    res.status(200).json({ message: 'User updated successfully' });
  } catch (err) {
    console.error(err);
    return next(CustomError( `Server Error`,500));
  }
});

const deleteUser=asyncErrorHandler( async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await db('users').where({ user_id: userId }).first();
    if (!user) {
      return next(CustomError( `User Not found`,404));

    }

    await db('users').where({ user_id: userId }).update({ status: '99' });

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    return next(CustomError( `Server Error`,500));
  }
});

const getAllUsers=asyncErrorHandler( async (req, res) => {
  try {
    const users = await db('users').select('user_id', 'first_name', 'username', 'email', 'status');
    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    return next(CustomError( `Server Error`,500));
  }
});

module.exports={getAllUsers,updateUser,deleteUser,getUser}