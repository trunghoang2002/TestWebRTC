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
const userStatus = {}; // Lưu trạng thái của mỗi user { peerId: "idle" | "busy" }

io.on("connection", (socket) => {
  console.log("socket id: ", socket.id);

  // Khi user đăng ký
  socket.on("signup", user => {
    console.log("signup: ", user);
    const isExist = arrUserInfos.some(e => e.username === user.username);
    if (isExist) {
      return socket.emit("signup-failed");
    }
    socket.peerId = user.peerId;
    arrUserInfos.push({ ...user, socketId: socket.id });
    userStatus[user.peerId] = "idle";
    socket.emit("signup-success", user.username);
    socket.broadcast.emit("new-user", user.username);
    io.emit("list-all-user", {users: arrUserInfos, status: userStatus});
  });

  // Khi user ngắt kết nối
  socket.on('disconnect', () => {
    const index = arrUserInfos.findIndex(e => e.peerId === socket.peerId); // có thể tìm kiếm theo socket.id?
    if (index !== -1) {
      const user = arrUserInfos[index];
      arrUserInfos.splice(index, 1);
      delete userStatus[user.peerId]; // Xóa trạng thái user
      io.emit("list-all-user", {users: arrUserInfos, status: userStatus});
      socket.broadcast.emit("user-disconnected", user);
    }
  });

  // Khi user logout
  socket.on('logout', () => {
    const index = arrUserInfos.findIndex(e => e.socketId === socket.id);
    if (index !== -1) {
        const user = arrUserInfos[index];
        arrUserInfos.splice(index, 1);
        delete userStatus[user.peerId]; // Xóa trạng thái user
        io.emit("update-user-status", userStatus);
        io.emit("list-all-user", {users: arrUserInfos, status: userStatus});
        socket.broadcast.emit("user-disconnected", user);
    }
});

  // Khi user cập nhật trạng thái
  socket.on("update-status", ({ peerId, status }) => {
    userStatus[peerId] = status;
    io.emit("update-user-status", { peerId: peerId, status: status });
  });
  
  // Khi user bắt đầu cuộc gọi
  socket.on("check-user-status", ({ peerId }, callback) => {
    if (userStatus[peerId] === "busy") {
        callback({ status: "busy" });
    } else {
        callback({ status: "idle" });
    }
  });

  // Khi user kết thúc cuộc gọi
  socket.on("end-call", ({ peerId }) => {
    userStatus[peerId] = "idle";
    io.emit("update-user-status", { peerId: peerId, status: "idle" });
  });
});

httpServer.listen(3000, "0.0.0.0", () => {
  console.log("Server is running on port 3000");
});
