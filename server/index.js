import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST"] // Allowed HTTP methods
  }
});

const arrUserInfos = [];

io.on("connection", (socket) => {
  console.log("socket id: ", socket.id);
  socket.on("signup", user => {
    console.log("signup: ", user);
    const isExist = arrUserInfos.some(e => e.username === user.username);
    if (isExist) {
      return socket.emit("signup-failed");
    }
    arrUserInfos.push({ ...user, socketId: socket.id });
    socket.emit("signup-success");
    socket.broadcast.emit("new-user", user);
    io.emit("all-user", arrUserInfos);

  });
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
