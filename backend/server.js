const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const dashboard = require("./v1/dashboard/dashboard.routes");
const globalErrorHandler = require("./utils/errorController");
const userRouter = require("./v1/users/user.routes");
const cartrouter = require("./v1/Cart/cart.routes");
const authRouter = require("./v1/auth/auth.routes");
const app = express();
const awsRoutes = require("./AWS/S3/aws.routes");
require("dotenv").config();
app.use(cors());
const logger = require("./middlewares/logger");
const http = require("http");
const socketIo = require("socket.io");
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
});
app.use(bodyParser.json());
app.use(helmet());
app.use(apiLimiter);
app.use(express.json());
const Port = process.env.PORT;
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/api", awsRoutes);
app.use("/dashboard", dashboard);
app.use("/cart", cartrouter);

let users = {};

io.on("connection", (socket) => {
  console.log("New client connected");
  socket.on("createRoom", (roomName) => {
    socket.join(roomName);
    console.log(` ${socket.id} created room: ${roomName}`);
    socket.emit("receiveMessage", {
      user: "Admin",
      message: `Room has Been Created: ${roomName}`,
      room: roomName,
    });
  });

  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    console.log(` ${socket.id} joined room: ${roomName}`);
    socket.emit("receiveMessage", {
      user: "Admin",
      message: `You joined the room: ${roomName}`,
      room: roomName,
    });
  });

  socket.on("leaveRoom", (roomName) => {
    socket.leave(roomName);
    console.log(` ${socket.id} left room: ${roomName}`);
    socket.emit("receiveMessage", {
      user: "Admin",
      message: `You left the room: ${roomName}`,
      room: roomName,
    });
  });

  socket.on("sendMessage", (messageData) => {
    io.to(messageData.room).emit("receiveMessage", messageData);
    console.log(`Message sent to room ${messageData.room}:`, messageData);
  });

  socket.on("userConnected", (username) => {
    users[socket.id] = username;
    console.log(`${username} connected`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
    delete users[socket.id];
  });
});

logger.info("Application started successfully");
app.use(globalErrorHandler);

server.listen(Port, () =>
  console.log(`Server running on http://localhost:${Port}`)
);
