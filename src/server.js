const express = require("express");
const { Server } = require("socket.io");
const { runCodeInDocker } = require("./docker/dockerService");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

io.of("/runCode").on("connection", (socket) => {
  console.log("Bir kullanıcı bağlandı!");

  socket.on("run_code", async (data) => {
    console.log("Kod çalıştırma isteği alındı:", data);

    try {
      const output = await runCodeInDocker(
        data.language,
        data.code,
        async () => {
          return new Promise((resolve) => {
            console.log("Girdi bekleniyor, input_request gönderildi");
            socket.emit("input_request");
            socket.once("input_response", (userInput) => {
              resolve(userInput);
            });
          });
        }
      );
      socket.emit("output", { output });
      // socket.emit("execution_complete", { message: "Program çalışması bitti" });
    } catch (error) {
      console.error("Kod çalıştırma hatası:", error);
      socket.emit("output", { output: `Hata: ${error.message}` });
    }
  });

  socket.on("disconnect", () => {
    console.log("Bir kullanıcı bağlantıyı kesti.");
  });
});

server.listen(5000, () => {
  console.log("Sunucu 5000 portunda çalışıyor!");
});
