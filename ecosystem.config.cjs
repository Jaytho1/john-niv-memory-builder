module.exports = {
  apps: [
    {
      name: "john-memory-app",
      script: "./server.mjs",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
    },
  ],
};
