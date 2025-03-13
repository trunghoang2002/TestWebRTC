import { createServer } from "http";
import { WebSocketServer } from "ws";

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
                <p>WebSocket server is up and ready to accept connections.</p>
            </div>
        </body>
        </html>
      `);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  });
const wss = new WebSocketServer({ server: httpServer });

const arrUserInfos = [];
const userStatus = {}; // Lưu trạng thái của mỗi user { peerId: "idle" | "busy" }

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");
//   console.log(ws);

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case "signup": {
          console.log("signup: ", data.username);
          const isExist = arrUserInfos.some(e => e.username === data.username);
          if (isExist) {
            ws.send(JSON.stringify({ type: "signup-failed" }));
            return;
          }
          data.ws = ws;
          arrUserInfos.push(data);
          userStatus[data.peerId] = "idle";
          ws.send(JSON.stringify({ type: "signup-success", username: data.username }));
          broadcast({ type: "new-user", username: data.username });
          broadcast({ type: "list-all-user", users: arrUserInfos, status: userStatus });
          break;
        }
        case "logout": {
          removeUser(ws);
          break;
        }
        case "update-status": {
          userStatus[data.peerId] = data.status;
          broadcast({ type: "update-user-status", peerId: data.peerId, status: data.status });
          break;
        }
        case "end-call": {
          userStatus[data.peerId] = "idle";
          broadcast({ type: "update-user-status", peerId: data.peerId, status: "idle" });
          break;
        }
      }
    } catch (error) {
      console.error("Invalid JSON received", error);
    }
  });

  ws.on("close", () => {
    removeUser(ws);
  });
});

function removeUser(ws) {
  const index = arrUserInfos.findIndex(e => e.ws === ws);
  if (index !== -1) {
    const user = arrUserInfos[index];
    arrUserInfos.splice(index, 1);
    delete userStatus[user.peerId];
    broadcast({ type: "list-all-user", users: arrUserInfos, status: userStatus });
    broadcast({ type: "user-disconnected", user });
  }
}

function broadcast(data) {
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(data));
    }
  });
}

httpServer.listen(3000, "0.0.0.0", () => {
  console.log("Server is running at http://localhost:3000");
});