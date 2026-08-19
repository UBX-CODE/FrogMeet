import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";

// 1. Express app create
const app = express();

// 2. HTTP server create
const server = http.createServer(app);

// CLIENT_URL = your Vercel frontend URL (set in Railway env vars)
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// 3. Express CORS configuration
app.use(cors({ origin: CLIENT_URL }));

// 4. Socket.IO server create
const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ["GET", "POST"] },
});

// 5. Basic test route
app.get("/", (_req, res) => {
  res.send("FrogMeet signaling server is running");
});

// 6. Socket.IO connection
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // A. JOIN ROOM

  socket.on("join-room", (roomId: string) => {
    socket.join(roomId);

    console.log(`User ${socket.id} joined room ${roomId}`);

    // Same room ke existing users ko batao
    // ki ek new user join hua hai
    socket.to(roomId).emit(
      "user-joined",
      socket.id
    );
  });

  // B. FORWARD WEBRTC OFFER
  socket.on("offer",({target,offer}: {
      target: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log(`Forwarding offer from ${socket.id} to ${target}`);

      io.to(target).emit("offer", {sender: socket.id,offer});
    }
  );

  // C. FORWARD WEBRTC ANSWER
  socket.on("answer",({target,answer}: {
      target: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log(`Forwarding answer from ${socket.id} to ${target}` );

      io.to(target).emit("answer", {sender: socket.id,answer});
    }
  );

  // D. FORWARD ICE CANDIDATE
  socket.on("ice-candidate", ({ target, candidate }: {
    target: string;
    candidate: RTCIceCandidateInit;
  }) => {
    console.log(`Forwarding ICE candidate from ${socket.id} to ${target}`);
    io.to(target).emit("ice-candidate", { sender: socket.id, candidate });
  });

  // E. DISCONNECT
  socket.on("disconnect", () => {
    console.log(
      "User disconnected:",
      socket.id
    );
  });
});


// 7. Start server
server.listen(3001, () => {
  console.log(
    "Signaling server running on http://localhost:3001"
  );
});