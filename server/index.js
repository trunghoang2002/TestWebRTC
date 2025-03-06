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
    socket.peerId = user.peerId;
    arrUserInfos.push({ ...user, socketId: socket.id });
    socket.emit("signup-success");
    socket.broadcast.emit("new-user", user.username);
    io.emit("all-user", arrUserInfos);
  });

  socket.on('disconnect', () => {
    const index = arrUserInfos.findIndex(e => e.peerId === socket.peerId); // có thể tìm kiếm theo socket.id?
    if (index !== -1) {
      const user = arrUserInfos[index];
      arrUserInfos.splice(index, 1);
      io.emit("all-user", arrUserInfos);
      socket.broadcast.emit("user-disconnected", user);
    }
  });
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
