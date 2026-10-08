// =============================================
// socket.js — Socket.IO Connection Setup
// =============================================
//
// WHAT THIS FILE DOES:
// - Figures out where the chat server is running
// - Creates a single shared Socket.IO connection
// - Uses a "singleton" pattern (only one socket connection ever exists)
//
// WHY WE NEED THIS:
// The chat server runs on port 4000, but the web app runs on port 3000.
// This file makes sure the browser connects to the right server,
// whether you're on localhost or another device on the LAN.

import { io } from "socket.io-client";

// ── getServerUrl ──
// Figures out the URL of the chat server.
//
// Example results:
//   - On your computer:       "http://localhost:4000"
//   - On a phone via WiFi:    "http://192.168.31.56:4000"
//
// HOW IT WORKS:
// If you opened the web app at "http://192.168.31.56:3000",
// then the server must be at "http://192.168.31.56:4000"
//https://local-network-chat-server.onrender.com/  render url . backend deploy in render 
// (same IP address, just different port number)
export function getServerUrl() {
  // If we're running on the server side (not in a browser), use localhost
  // "window" only exists in browsers, not in Node.js
  const SERVER_URL = "https://local-network-chat-server.onrender.com";
  if (typeof window === "undefined") {
    return SERVER_URL;
  }

  // In the browser: use the same hostname that the page was loaded from
  const protocol = window.location.protocol; // "http:" or "https:"
  const hostname = window.location.hostname;  // e.g., "localhost" or "192.168.31.56"
  const serverUrl = `${protocol}//${hostname}:4000`;

  return serverUrl;
}

// ── Singleton Socket ──
// We only want ONE socket connection for the entire app.
// This variable stores it so we don't create duplicates.
let socket = null;

// ── getSocket ──
// Returns the socket connection. Creates it the first time it's called.
// Every time after that, it returns the same socket.
export function getSocket() {
  if (socket === null) {
    // First time — create the socket connection
    socket = io(getServerUrl(), {
      autoConnect: false,           // Don't connect immediately — we'll call connect() manually
      reconnection: true,           // Automatically try to reconnect if connection drops
      reconnectionAttempts: Infinity, // Never give up trying to reconnect
      reconnectionDelay: 1000,      // Wait 1 second before first retry
      reconnectionDelayMax: 5000,   // Maximum wait between retries: 5 seconds
    });
  }

  return socket;
}
