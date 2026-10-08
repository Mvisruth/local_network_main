// =============================================
// socket.js — Socket.IO Connection Setup
// =============================================
//
// WHAT THIS FILE DOES:
// - Connects the frontend to the Socket.IO backend
// - Creates one shared Socket.IO connection
// - Uses a "singleton" pattern
//
// PRODUCTION BACKEND:
// https://local-network-chat-server.onrender.com
//
// The frontend can be running on:
// - localhost
// - another device
// - Vercel
//
// In all cases, the Socket.IO connection goes to
// the deployed Render backend.

import { io } from "socket.io-client";

// ── Server URL ─────────────────────────────────
//
// This is the deployed Node.js + Socket.IO backend.
const SERVER_URL = "https://local-network-chat-server.onrender.com";

// ── getServerUrl ───────────────────────────────
//
// Returns the backend URL.
//
// We don't need to check window.location here because
// the backend is now deployed separately on Render.
export function getServerUrl() {
  return SERVER_URL;
}

// ── Singleton Socket ───────────────────────────
//
// We only want ONE Socket.IO connection for the app.
//
// Initially there is no socket.
let socket = null;

// ── getSocket ──────────────────────────────────
//
// Creates the socket the first time this function is called.
//
// After that, it returns the same socket object.
export function getSocket() {
  if (socket === null) {
    // Create the Socket.IO connection
    socket = io(getServerUrl(), {
      // Don't connect immediately.
      // page.js will call socket.connect().
      autoConnect: false,

      // Automatically try to reconnect
      // if the connection is lost.
      reconnection: true,

      // Keep trying forever.
      reconnectionAttempts: Infinity,

      // Wait 1 second before the first retry.
      reconnectionDelay: 1000,

      // Don't wait more than 5 seconds between retries.
      reconnectionDelayMax: 5000,
    });
  }

  // Return the existing socket.
  return socket;
}