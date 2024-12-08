module.exports = {
  PORT: process.env.PORT || 5000,
  DOCKER_IMAGE: {
    python: "python:3.9",
    java: "openjdk:11",
    cpp: "gcc:latest",
  },
  SOCKET_IO_NAMESPACE: "/runCode",
};
