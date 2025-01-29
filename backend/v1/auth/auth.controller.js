const bcrypt = require("bcryptjs");
const knex = require("knex");
const jwt = require("jsonwebtoken");
const { Model } = require("objection");
const knexConfig = require("./../../knexfile");
const { signupUserSchema, loginUserSchema } = require("./auth.utils");
const asyncErrorHandler = require("../../utils/asyncErrorHandler");
const CustomError = require("../../utils/CustomError");
const encryptPayload = require("../../middlewares/encrypt");
const encryptData = require("../../middlewares/encrypt");
const nodemailer = require("nodemailer");
const db = knex(knexConfig);
Model.knex(db);

const JWT_SECRET = "AkriviaHCM";
const Refresh_secret = "AkriviaAutomation";

function generateAccessToken(user) {
  return jwt.sign(
    { user_id: user.user_id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: "4h" }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { user_id: user.user_id, username: user.username, email: user.email },
    Refresh_secret,
    { expiresIn: "7d" }
  );
}

const CreateUser = asyncErrorHandler(async (req, res, next) => {
  const { first_name, last_name, email, password } = req.body;
  const { error } = signupUserSchema.validate(req.body);
  if (error) {
    console.log("error", error.details[0].message);
    return next(CustomError(error.details[0].message, 400));
  }

  try {
    const existingUser = await db("users").where({ email }).first();
    if (existingUser) {
      return next(CustomError("Email Already Exists", 400));
    }
    console.log("22");
    //const username = `${first_name} ${last_name}`;
    const username = `${String(first_name).toLowerCase()} ${String(
      last_name
    ).toLowerCase()}`;

    const existingUserName = await db("users").where({ username }).first();
    if (existingUserName) {
      return next(
        CustomError(
          "The combination already exists try to change firstname or lastname ",
          400
        )
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("11");
    const [user_id] = await db("users").insert({
      first_name,
      username,
      password: hashedPassword,
      email,
      status: "0",
    });
    console.log(user_id);
    const encrypted = encryptPayload({ message: "user created successfully" });
    res.status(201).json(encrypted);
  } catch (err) {
    console.error(err);
    return next(CustomError("Error", 500));
  }
});

const loginUser = asyncErrorHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const { error } = loginUserSchema.validate(req.body);
  if (error) {
    return next(CustomError(error.details[0].message, 400));
  }
  try {
    const user = await db("users")
      .where({ email })
      .orWhere({ username: email })
      .first();
    if (!user) {
      return next(CustomError("User not found", 400));
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return next(CustomError("Invaild Credentials", 400));
    }
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const encrypted = encryptPayload({
      message: "Login successful",
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    res.status(200).json(encrypted);
  } catch (err) {
    return next(CustomError("Error in logging in", 500));
  }
});

const RefreshToken = asyncErrorHandler(async (req, res, next) => {
  const { refresh_token } = req.body;
  if (!refresh_token) {
    return next(CustomError("Refresh token is required", 401));
  }
  jwt.verify(refresh_token, Refresh_secret, (err, decoded) => {
    if (err) {
      return next(CustomError("Invalid or expired refresh token", 403));
    }
    const newAccessToken = generateAccessToken(decoded);
    const newrefresh = generateRefreshToken(decoded);
    console.log("came inside 3", newAccessToken, newrefresh);
    res.json(
      encryptData({ access_token: newAccessToken, refresh_token: newrefresh })
    );
  });
});

const sendEmail = asyncErrorHandler(async (req, res, next) => {
  const { email } = req.body;
  console.log(req.body);
  try {
    const user = await db("users").where({ email }).first();
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const expiryTime = 360;
    const token = jwt.sign({ email }, "key", {
      expiresIn: expiryTime,
    });
    const updated = await db("users").where({ email }).update({
      reset_token: token,
    });
    if (!updated) {
      return res.status(500).json({ message: "Failed to update reset token" });
    }
    const mailTransporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "prlvinay2504@gmail.com",
        pass: "yxuucxpkchfkbvql",
      },
    });

    const mailDetails = {
      from: "prlvinay2504@gmail.com",
      to: email,
      subject: "Reset Password Request",
      html: `
        <html>
          <head>
            <title>Reset Password</title>
            <!-- Bootstrap 4/5 CDN -->
            <link href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.2/dist/css/bootstrap.min.css" rel="stylesheet">
          </head>
          <body style="background-color: #f8f9fa; padding: 20px;">
            <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); padding: 30px;">
              <h1 class="text-center text-primary">Password Reset Request</h1>
              <p class="lead">Dear ${user.username},</p>
              <p>We have received a request to reset your password. To proceed, please click the button below:</p>
              
              <!-- Reset Password Button -->
              <div class="text-center">
                <a href="http://localhost:4200/auth/reset/${token}" class="btn btn-primary btn-lg" style="padding: 10px 20px; font-size: 16px; text-decoration: none;">Reset Your Password</a>
              </div>
              
              <p class="mt-4">If you did not request this change, please ignore this email or contact our support team.</p>
              <p class="mt-4">Thank you for using our service!</p>
            </div>
            
            <!-- Footer -->
            <div class="text-center mt-4" style="font-size: 12px; color: #6c757d;">
              <p>For any assistance, visit our <a href="" class="text-primary">Help Center</a>.</p>
              <p>This email was sent by team PRL Vinay.</p>
            </div>
          </body>
        </html>
      `,
    };

    await mailTransporter.sendMail(mailDetails, (err, data) => {
      if (err) {
        console.log("Error sending email:", err);
        return res.status(500).json({ message: "Failed to send reset email" });
      }
      res.json(
        encryptData({ message: "Password reset email sent successfully" })
      );
    });
  } catch (err) {
    console.log("Error during sending email:", err);
    //next(err);
  }
});

const resetPass = asyncErrorHandler(async (req, res, next) => {
  console.log("req.body", req.body);
  const token = req.body.token;
  const newPassword = req.body.newPassword;
  console.log("New password received:", newPassword);
  try {
    jwt.verify(token, "key", async (err, data) => {
      if (err) {
        return next(CustomError("reset Link Expired", 500));
      } else {
        const response = data;
        const email = response.email;
        const user = await db("users").where({ email }).first();

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db("users").where({ email }).update({
          password: hashedPassword,
          reset_token: null,
        });
        res
          .status(200)
          .json(encryptData({ message: "Password reset successfully" }));
      }
    });
  } catch (err) {
    res.status(500).json(encryptData({ message: "Error resetting password" }));
  }
});

module.exports = { CreateUser, loginUser, RefreshToken, sendEmail, resetPass };
