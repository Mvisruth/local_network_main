// =============================================
// rooms.js — Manages Chat Rooms & Members
// =============================================
//
// WHAT THIS FILE DOES:
// - Keeps track of which users (members) are in which chat rooms
// - Stores everything in memory (RAM) — nothing is saved to disk
// - When the server restarts, all rooms are gone (this is intentional for privacy)
//
// IMPORTANT: This file NEVER stores any message content.
// Messages pass through the server and are immediately forwarded — never saved.

// ── Storage ──
// A "Map" is like a dictionary/phonebook:
//   Key = room name (like "local-network")
//   Value = an object with { members, createdAt }
//
// Each room's "members" is also a Map:
//   Key = socket ID (unique ID for each connected user)
//   Value = member info (like { displayName: "anon1234" })
const rooms = new Map();

// ── getOrCreateRoom ──
// Gets a room by its name. If the room doesn't exist yet, create it first.
// This way we never get errors trying to access a room that doesn't exist.
export function getOrCreateRoom(roomCode) {
  // Check if this room already exists
  const roomExists = rooms.has(roomCode);
  if (!roomExists) {
    // Room doesn't exist — create a new empty room
    const newRoom = {
      members: new Map(), // No members yet
      createdAt: Date.now(), // Remember when this room was created
    };
    rooms.set(roomCode, newRoom);
  }
  console.log("->", rooms);
  // Return the room (either the existing one or the newly created one)
  return rooms.get(roomCode);
}

// ── addMember ──
// Adds a user to a room. If the room doesn't exist, it gets created first.
// "socketId" is the unique ID that Socket.IO gives each connected user.
// "memberInfo" is an object like { displayName: "anon1234" }.
export function addMember(roomCode, socketId, memberInfo) {
  const room = getOrCreateRoom(roomCode);
  room.members.set(socketId, memberInfo);
  return room;
}

// ── hasMember ──
// Checks if a specific user is already in a room.
// Returns true or false.
export function hasMember(roomCode, socketId) {
  const room = rooms.get(roomCode);

  // If the room doesn't exist, the user is definitely not in it
  if (!room) {
    return false;
  }

  // Check if this socket ID is in the room's member list
  return room.members.has(socketId);
}

// ── removeMember ──
// Removes a user from a room (e.g., when they disconnect).
// If the room becomes empty after removing, delete the room too
// (this prevents memory from growing forever).
export function removeMember(roomCode, socketId) {
  const room = rooms.get(roomCode);

  // If the room doesn't exist, there's nothing to do
  if (!room) {
    return;
  }

  // Remove this user from the room
  room.members.delete(socketId);

  // If the room is now empty, delete it completely
  const roomIsEmpty = room.members.size === 0;
  if (roomIsEmpty) {
    rooms.delete(roomCode);
  }
}

// ── getMembers ──
// Returns a list of all members in a room as a simple array.
// Each item looks like: { id: "socket123", displayName: "anon1234" }
export function getMembers(roomCode) {
  const room = rooms.get(roomCode);

  // If the room doesn't exist, return an empty list
  if (!room) {
    return [];
  }

  // Convert the Map into a simple array that's easy to work with
  // Map entries look like: ["socket123", { displayName: "anon1234" }]
  // We convert each entry to: { id: "socket123", displayName: "anon1234" }
  const memberList = [];
  for (const [socketId, info] of room.members.entries()) {
    memberList.push({
      id: socketId,
      ...info, // Spread operator: copies all properties from "info" into this object
    });
  }

  return memberList;
}

// ── findRoomBySocket ──
// Given a socket ID, find which room that user is in.
// Returns the room code (like "local-network") or null if not found.
// This is useful when a user disconnects — we need to know which room to update.
export function findRoomBySocket(socketId) {
  // Loop through every room and check if this user is in it
  for (const [roomCode, room] of rooms.entries()) {
    if (room.members.has(socketId)) {
      return roomCode; // Found it!
    }
  }

  // User wasn't found in any room
  return null;
}

// ── roomStats ──
// Returns a summary of all rooms (used for debugging/health checks).
// Example output: [{ code: "local-network", memberCount: 3, createdAt: 1234567890 }]
export function roomStats() {
  const stats = [];

  for (const [roomCode, room] of rooms.entries()) {
    stats.push({
      code: roomCode,
      memberCount: room.members.size,
      createdAt: room.createdAt,
    });
  }

  return stats;
}
