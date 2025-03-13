import { createServer } from "http";
// import { createServer } from "https";
// import { readFileSync } from "fs";
import { Server } from "socket.io";

const httpServer = createServer();

// Route để phục vụ trang HTML
httpServer.on("request", (req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Server is running</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background-color: #f4f4f9;
              }
              .container {
                  text-align: center;
                  background-color: #fff;
                  padding: 20px;
                  border-radius: 10px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              }
              h1 {
                  color: #333;
              }
              p {
                  color: #666;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Server is running 🚀</h1>
              <p>Socket.IO server is up and ready to accept connections.</p>
          </div>
      </body>
      </html>
    `);
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

const io = new Server(httpServer, {
  cors: {
    origin: "*", // Cho phép kết nối từ mọi nguồn
    methods: ["GET", "POST"] // Các phương thức HTTP được phép
  }
});
// const options = {
//   key: readFileSync("key.pem"),
//   cert: readFileSync("cert.pem")
// };

// const httpsServer = createServer(options);
// const io = new Server(httpsServer, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

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
        io.emit("list-all-user", {users: arrUserInfos, status: userStatus});
        socket.broadcast.emit("user-disconnected", user);
    }
});

  // Khi user cập nhật trạng thái
  socket.on("update-status", ({ peerId, status }) => {
    userStatus[peerId] = status;
    io.emit("update-user-status", { peerId: peerId, status: status });
  });
  
  // // Khi user bắt đầu cuộc gọi
  // socket.on("check-user-status", ({ peerId }, callback) => {
  //   if (userStatus[peerId] === "busy") {
  //       callback({ status: "busy" });
  //   } else {
  //       callback({ status: "idle" });
  //   }
  // });

  // Khi user kết thúc cuộc gọi
  socket.on("end-call", ({ peerId }) => {
    userStatus[peerId] = "idle";
    io.emit("update-user-status", { peerId: peerId, status: "idle" });
  });
});

httpServer.listen(3000, "0.0.0.0", () => {
  console.log("HTTP Server is running at http://localhost:3000");
});
// httpsServer.listen(3000, "0.0.0.0",() => {
//   console.log("HTTPS Server is running at https://localhost:3000");
// });