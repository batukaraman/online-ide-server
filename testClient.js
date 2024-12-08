const { io } = require("socket.io-client");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const socket = io("http://localhost:5000/runCode");

let isWaitingForInput = false;

socket.on("connect", () => {
  console.log("Bağlantı başarılı!");

  const data = {
    language: "python",
    code: `
name = input("Adınız nedir?")
print(f"Merhaba, {name}!")
`,
  };

  socket.emit("run_code", data);
});

socket.on("output", (data) => {
  process.stdout.write(data.output);
});

socket.on("input_request", () => {
  if (!isWaitingForInput) {
    isWaitingForInput = true;
    rl.question(">>> ", (userInput) => {
      isWaitingForInput = false;
      socket.emit("input_response", userInput);
    });
  }
});

socket.on("execution_complete", (data) => {
  console.log(`\n${data.message}`);
  socket.disconnect();
});

socket.on("connect_error", (error) => {
  console.error("Bağlantı hatası:", error);
});

socket.on("disconnect", () => {
  console.log("Bağlantı kapatıldı.");
});
