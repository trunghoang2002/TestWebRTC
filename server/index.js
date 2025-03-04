import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: "*", // Allow requests from this origin
    methods: ["GET", "POST"] // Allowed HTTP methods
  }
});

io.on("connection", (socket) => {
  console.log("socket id: ", socket.id);
});

httpServer.listen(3000, () => {
  console.log("Server is running on port 3000");
});
