import { io } from "socket.io-client";

// Use environment variable for the server URL in production, fallback to localhost for development
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL, {
  autoConnect: false,
});