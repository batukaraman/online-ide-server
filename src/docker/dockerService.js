const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const logger = require("../utils/logger");
const config = require("../config/config");

/**
 * Kodun diline göre uygun Docker container'ı çalıştırır.
 * @param {string} language - Çalıştırılacak dil (python, java, cpp)
 * @param {string} code - Kullanıcının gönderdiği kod
 * @param {Function} onInputRequest - Girdi gerektiğinde çağrılacak fonksiyon.
 * @returns {Promise<string>} Çıktıyı döndüren bir Promise.
 */
async function runCodeInDocker(language, code, onInputRequest) {
  const tempDir = path.join(__dirname, "../../temp");
  const fileName = `code_${Date.now()}`;
  let filePath;
  let dockerCommand;

  try {
    await fs.mkdir(tempDir, { recursive: true });

    switch (language) {
      case "python":
        filePath = path.join(tempDir, `${fileName}.py`);
        const flushCode = `import sys; sys.stdout.flush()\n${code}`;
        await fs.writeFile(filePath, flushCode);
        dockerCommand = `docker run --rm -i -v ${tempDir}:/app -w /app ${config.DOCKER_IMAGE.python} python3 ${fileName}.py`;
        break;

      case "java":
        filePath = path.join(tempDir, `Main.java`);
        await fs.writeFile(filePath, code);
        dockerCommand = `docker run --rm -i -v ${tempDir}:/app -w /app ${config.DOCKER_IMAGE.java} sh -c "javac Main.java && java Main"`;
        break;

      case "cpp":
        filePath = path.join(tempDir, `${fileName}.cpp`);
        await fs.writeFile(filePath, code);
        dockerCommand = `docker run --rm -i -v ${tempDir}:/app -w /app ${config.DOCKER_IMAGE.cpp} sh -c "g++ ${fileName}.cpp -o ${fileName} && ./${fileName}"`;
        break;

      default:
        throw new Error("Desteklenmeyen dil!");
    }

    const childProcess = spawn(dockerCommand, { shell: true });

    let output = "";
    let error = "";

    let isWaitingForInput = false;

    childProcess.stdout.on("data", async (data) => {
      const outputText = data.toString();
      console.log("STDOUT'dan gelen veri:", outputText);
      output = outputText;

      if (!isWaitingForInput) {
        isWaitingForInput = true;
        const userInput = await onInputRequest();
        isWaitingForInput = false;
        childProcess.stdin.write(`${userInput}\n`);
      }
    });

    childProcess.stderr.on("data", (data) => {
      error += data.toString();
      console.error("STDERR'dan hata alındı:", error);
    });

    const exitCode = await new Promise((resolve) => {
      childProcess.on("close", resolve);
    });

    if (exitCode !== 0) {
      throw new Error(error || "Bilinmeyen hata");
    }

    return output;
  } catch (err) {
    logger.error(`Kod çalıştırılırken hata oluştu: ${err.message}`);
    throw err;
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        logger.warn(`Geçici dosya silinemedi: ${filePath}`);
      }
    }
  }
}

module.exports = {
  runCodeInDocker,
};
