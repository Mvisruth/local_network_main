// =============================================
// index.js — Main Chat Server
// =============================================
//
// WHAT THIS FILE DOES:
// - Creates a WebSocket server using Socket.IO
// - When users connect, they join a shared chat room
// - When someone sends an encrypted message, the server
//   forwards it to other users WITHOUT ever reading it
// - The server ONLY sees encrypted data — never the actual message text
//
// HOW TO RUN:
//   node index.js
//   (Server starts on port 4000 by default)

// ── Step 1: Import the tools we need ──
import express from "express"; // Express framework
import { createServer } from "http"; // Built-in Node.js HTTP server
import { Server } from "socket.io"; // Socket.IO for real-time communication

// Import our room management functions (from rooms.js)
import {
  addMember,
  removeMember,
  getMembers,
  findRoomBySocket,
  hasMember,
  roomStats,
} from "./rooms.js";

// ── Step 2: Configuration ──

// Which port to run the server on
// Uses the PORT environment variable if set, otherwise defaults to 4000
const PORT = process.env.PORT || 4000;

// The name of our single chat room — everyone joins this same room
const ROOM_CODE = "local-network";

// ── Step 3: Create the HTTP server ──
// This is the basic web server that Socket.IO builds on top of
const app = express();
const httpServer = createServer(app);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "connected",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    message: "connected",
  });
});

// We only have one URL endpoint: "/health"
// This lets you check if the server is running by visiting http://localhost:4000/health
app.get("/health", (req, res) => {
  const healthData = {
    ok: true,
    rooms: roomStats(), // Show info about active rooms
  };
  res.json(healthData);
});

// For any other URL, return "404 Not Found"
app.use((req, res) => {
  res.status(404).end();
});

// ── Step 4: Create the Socket.IO server ──
// Socket.IO handles real-time two-way communication between browser and server
const io = new Server(httpServer, {
  cors: {
    // Allow connections from any device on the local network
    // This is needed because the web app and server run on different ports
    origin: function (origin, callback) {
      callback(null, true); // Allow all origins (safe for local network use)
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  // How long to wait before considering a connection dead
  pingTimeout: 5000, // 5 seconds without a response = disconnected
  pingInterval: 10000, // Check every 10 seconds if user is still connected
});

// ── Helper Function ──
// Sends the updated member list to everyone in the room
// Called whenever someone joins or leaves
function broadcastRoomUpdate() {
  const allMembers = getMembers(ROOM_CODE);
  // console.log("e",allMembers)
  io.to(ROOM_CODE).emit("members-update", {
    members: allMembers,
    count: allMembers.length,
  });
}

// ── Step 5: Handle socket connections ──
// This runs every time a new user connects to the gserver
io.on("connection", (socket) => {
  console.log(`[connect] New user connected: ${socket.id}`);

  // ──────────────────────────────────────────
  // EVENT: "join-network"
  // When a user wants to join the chat room
  // ──────────────────────────────────────────
  socket.on("join-network", ({ displayName }) => {
    //true
    // Don't allow joining without a name
    if (!displayName) {
      //false
      return;
    }

    // Check if this user is already in the room (e.g., reconnecting)
    const isNewMember = !hasMember(ROOM_CODE, socket.id);

    // Add the user to the Socket.IO room (for message broadcasting)
    socket.join(ROOM_CODE);

    // Add the user to our member tracking system
    addMember(ROOM_CODE, socket.id, { displayName });
    
    // Get the current list of everyone in the room
    const currentMembers = getMembers(ROOM_CODE);

    // Tell the new user who else is already in the room
    // (Filter out themselves from the list)
    const otherMembers = currentMembers.filter(
      (member) => member.id !== socket.id,
    );
    socket.emit("network-joined", {
      members: otherMembers,
      count: currentMembers.length,
    });

    // If this is a brand new member (not a reconnection),
    // tell everyone else that someone new joined
    if (isNewMember) {
      socket.to(ROOM_CODE).emit("member-joined", {
        id: socket.id,
        displayName: displayName,
      });
    }

    // Send updated member list to everyone
    broadcastRoomUpdate();

    console.log(
      `[join] ${displayName} joined ${ROOM_CODE} (${currentMembers.length} members total)`,
    );
  });

  // ──────────────────────────────────────────
  // EVENT: "send-message"
  // When a user sends an encrypted message
  // ──────────────────────────────────────────
  // IMPORTANT: The server NEVER reads the message content!
  // It only forwards the encrypted data (ciphertext + iv) to other users.
  socket.on("send-message", ({ ciphertext, iv, targetId }) => {
    // Don't process if required data is missing
    if (!ciphertext || !iv) {
      return;
    }

    // Build the message package to forward
    const messageToForward = {
      senderId: socket.id, // Who sent it
      ciphertext: ciphertext, // The encrypted message (unreadable by server)
      iv: iv, // Encryption nonce (needed to decrypt)
      timestamp: Date.now(), // When it was sent
    };

    if (targetId) {
      // PRIVATE MESSAGE: Send only to one specific user
      io.to(targetId).emit("message", {
        ...messageToForward,
        private: true,
      });
    } else {
      // PUBLIC MESSAGE: Send to everyone in the room except the sender
      socket.to(ROOM_CODE).emit("message", messageToForward);
    }
  });

  // ──────────────────────────────────────────
  // EVENT: "typing"
  // When a user is typing (just a visual indicator)
  // ──────────────────────────────────────────
  socket.on("typing", ({ displayName }) => {
    // Tell everyone else in the room that this user is typing
    socket.to(ROOM_CODE).emit("typing", {
      displayName: displayName,
      id: socket.id,
    });
  });

  // ──────────────────────────────────────────
  // EVENT: "emergency-wipe"
  // When a user wants to immediately leave and clear their presence
  // ──────────────────────────────────────────
  socket.on("emergency-wipe", () => {
    // Remove the user from our tracking
    removeMember(ROOM_CODE, socket.id);

    // Tell everyone else this user left
    socket.to(ROOM_CODE).emit("member-left", { id: socket.id });

    // Remove them from the Socket.IO room
    socket.leave(ROOM_CODE);

    // Update everyone's member list
    broadcastRoomUpdate();

    console.log(`[wipe] User ${socket.id} triggered emergency wipe`);
  });

  // ──────────────────────────────────────────
  // EVENT: "disconnect"
  // When a user's connection drops (closing browser, losing internet, etc.)
  // ──────────────────────────────────────────
  socket.on("disconnect", () => {
    // Find which room this user was in
    const roomCode = findRoomBySocket(socket.id);

    if (roomCode) {
      // Get the user's info before removing them (so we can log their name)
      const allMembers = getMembers(roomCode);
      const disconnectedMember = allMembers.find(
        (member) => member.id === socket.id,
      );
      const userName = disconnectedMember
        ? disconnectedMember.displayName
        : socket.id;

      // Remove them from the room
      removeMember(roomCode, socket.id);

      // Tell everyone else they left
      socket.to(roomCode).emit("member-left", { id: socket.id });

      // Update everyone's member list
      broadcastRoomUpdate();

      console.log(`[disconnect] ${userName} disconnected`);
    } else {
      // User disconnected but wasn't in any room
      console.log(`[disconnect] Unknown user ${socket.id} disconnected`);
    }
  });
});

// ── Step 6: Start the server ──
// "0.0.0.0" means accept connections from any device (not just localhost)
// This is important for LAN access — other devices on the same WiFi can connect
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Chat server is running on http://0.0.0.0:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
