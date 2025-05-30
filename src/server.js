import { Server } from "socket.io";
import http from "http";
import express from "express";
import cors from "cors";

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://react-social-media-client.netlify.app",
  "http://localhost:5173",
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

const getOnlineUsers = () => {
  const onlineUsers = [];
  const socketIds = [...io.sockets.adapter.sids.keys()];

  for (const socketId of socketIds) {
    const socket = io.sockets.sockets.get(socketId);

    onlineUsers.push({
      id: socket.id,
      name: socket.name,
      email: socket.email,
    });
  }
  return onlineUsers;
};

io.on("connection", (socket) => {
  console.log(`Peer connected: ${socket.id}`);

  socket.on("setname", ({ name, email }) => {
    socket.name = name;
    socket.email = email;

    io.emit("getusers", getOnlineUsers());
  });

  // Notify other peers about the new connection
  io.emit("new-peer", socket.id);

  // Handle offer from a peer
  socket.on("offer", ({ offer, targetPeerId }) => {
    io.to(targetPeerId).emit("offer", { fromPeerId: socket.id, offer });
  });

  // Handle answer from a peer
  socket.on("answer", ({ targetPeerId, answer }) => {
    io.to(targetPeerId).emit("answer", { fromPeerId: socket.id, answer });
  });

  // Handle ICE candidates
  socket.on("ice-candidate", ({ targetPeerId, candidate }) => {
    io.to(targetPeerId).emit("ice-candidate", {
      fromPeerId: socket.id,
      candidate,
    });
  });

  //Call Negotiation

  socket.on("call", ({ to, offer, cType }) => {
    if (to) {
      io.to(to).emit("incomingCall", {
        from: socket.id,
        callerName: socket.name,
        offer,
        cType,
      });
    }
  });

  socket.on("rejected", ({ to, cType }) => {
    io.to(to).emit("rejected", { from: socket.name, cType });
  });

  socket.on("callAnswered", ({ to, answer, cType }) => {
    if (to) io.to(to).emit("callAnswered", { answer, cType });
  });

  socket.on("iceCandidate", ({ to, candidate }) => {
    io.to(to).emit("iceCandidate", { candidate });
  });

  socket.on("disconnect", () => {
    io.emit("getusers", getOnlineUsers());
    io.emit("peer-disconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Signaling server is running on port 3000");
});