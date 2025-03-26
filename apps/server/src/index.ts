console.log("Hello, Baig!");

import http from "http";
import dotenv from "dotenv";
import SocketService from "./services/socket";

dotenv.config(); // Load environment variables

async function init() {
    console.log("🔵 Initializing Socket Service...");

    const socketService = new SocketService();
    const httpServer = http.createServer();
    const PORT = process.env.PORT || 8000;

    console.log("🟡 Attaching Socket Service to HTTP server...");
    socketService.io.attach(httpServer);

    httpServer.listen(PORT, () => {
        console.log(`🟢 Server is running on port ${PORT}`);
    });

    // Handle server errors
    httpServer.on("error", (err) => {
        console.error("❌ Server Error:", err);
    });

    console.log("🟡 Initializing socket event listeners...");
    socketService.initListeners();
    console.log("✅ Socket event listeners initialized.");
}

init();
