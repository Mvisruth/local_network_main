"use client";

// =============================================
// page.js — Main Chat Page (React Component)
// =============================================
//
// WHAT THIS FILE DOES:
// - Shows the chat interface (header, messages, input box)
// - Connects to the chat server using Socket.IO
// - Encrypts messages before sending, decrypts when receiving
// - Auto-deletes messages after 5 minutes (ephemeral chat)
// - Shows who's online and who's typing

import { useEffect, useRef, useState, useCallback } from "react";
import { getSocket } from "../lib/socket";
import { deriveRoomKey, encryptMessage, decryptMessage } from "../lib/crypto";

// ── Constants ──
const ROOM_CODE = "local-network";                // The room everyone joins
const MESSAGE_LIFETIME = 5 * 60 * 1000;           // 5 minutes in milliseconds

// ── Helper: Generate a Random Anonymous Name ──
// Creates names like "anon1234", "anon5678", etc.
function generateAnonName() {
  const randomNumber = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
  return `anon${randomNumber}`;
}

// ── Helper: Get or Create a Persistent Anonymous Name ──
// Saves the name in localStorage so you keep the same name across page refreshes.
// If localStorage is not available (e.g., on the server), just generate a new name.
function getOrCreateAnonName() {
  // Check if we're running in a browser (not on the server)
  if (typeof window === "undefined") {
    return generateAnonName();
  }

  try {
    // Try to get a previously saved name
    let savedName = localStorage.getItem("chat_anon_name");

    if (!savedName) {
      // No saved name — create a new one and save it
      savedName = generateAnonName();
      localStorage.setItem("chat_anon_name", savedName);
    }

    return savedName;
  } catch {
    // localStorage might be blocked (e.g., private browsing mode)
    return generateAnonName();
  }
}

// ── Helper: Format a Timestamp into a Readable Time ──
// Converts a timestamp like 1695900000000 into "02:30 PM"
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function Home() {
  // ── Refs ──
  // Refs hold values that persist across re-renders without causing re-renders.
  // Think of them as "bookmarks" to important objects.
  const socketRef = useRef(null);        // Reference to the socket connection
  const roomKeyRef = useRef(null);       // Reference to the encryption key
  const messagesEndRef = useRef(null);   // Reference to the bottom of the message list (for auto-scroll)
  const typingTimerRef = useRef(null);   // Timer to prevent spamming "typing" events
  const inputRef = useRef(null);         // Reference to the text input field

  // ── State ──
  // State variables cause the page to re-render when they change.
  const [displayName] = useState(() => getOrCreateAnonName());  // Your anonymous name
  const [members, setMembers] = useState([]);                    // Other users in the room
  const [onlineCount, setOnlineCount] = useState(1);             // Total number of online users
  const [messages, setMessages] = useState([]);                  // Chat messages on screen
  const [draft, setDraft] = useState("");                        // What you're currently typing
  const [typingUsers, setTypingUsers] = useState([]);            // Users who are currently typing
  const [connected, setConnected] = useState(false);             // Are we connected to the server?
  const [joining, setJoining] = useState(true);                  // Are we still joining the room?

  // ── Auto-Scroll to Bottom ──
  // Whenever new messages appear or someone starts typing, scroll to the bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, typingUsers]);

  // ── Add Message with Auto-Delete ──
  // Adds a message to the screen and schedules it to be removed after 5 minutes
  const addMessage = useCallback((newMessage) => {
    // Add the message to the list
    setMessages((currentMessages) => [...currentMessages, newMessage]);

    // Schedule auto-deletion after 5 minutes
    setTimeout(() => {
      setMessages((currentMessages) =>
        currentMessages.filter((message) => message.id !== newMessage.id)
      );
    }, MESSAGE_LIFETIME);
  }, []);

  // ── Socket Connection Setup ──
  // This runs ONCE when the page first loads
  useEffect(() => {
    // This flag prevents updating state after the component is removed
    let isComponentMounted = true;

    // Step 1: Create the encryption key from the room code
    roomKeyRef.current = deriveRoomKey(ROOM_CODE);

    // Step 2: Get the socket connection
    const socket = getSocket();
    socketRef.current = socket;

    // ── Socket Event Handlers ──
    // These functions run when the server sends us different types of events

    // When we successfully connect to the server
    function onConnect() {
      if (!isComponentMounted) return;
      setConnected(true);
      // Tell the server we want to join the chat room
      socket.emit("join-network", { displayName });
    }

    // When we lose connection to the server
    function onDisconnect() {
      if (!isComponentMounted) return;
      setConnected(false);
      setJoining(true);  // We'll need to rejoin when we reconnect
    }

    // When there's an error connecting
    function onConnectionError(error) {
      if (!isComponentMounted) return;
      console.error("Socket connection error:", error);
      setConnected(false);
      setJoining(true);
    }

    // When the server confirms we've joined the room
    // It sends us the list of other members already in the room
    function onNetworkJoined({ members: existingMembers, count }) {
      if (!isComponentMounted) return;
      setMembers(existingMembers);

      // Update online count (use server-provided count if available)
      if (typeof count === "number") {
        setOnlineCount(count);
      } else {
        setOnlineCount(existingMembers.length + 1); // +1 to include ourselves
      }

      setJoining(false);  // We've successfully joined!
    }

    // When the server sends an updated member list
    function onMembersUpdate({ members: allMembers, count }) {
      if (!isComponentMounted) return;

      // Remove ourselves from the list (we don't need to see our own name)
      const myId = socket.id;
      const otherMembers = allMembers.filter((member) => member.id !== myId);
      setMembers(otherMembers);

      // Update online count
      if (typeof count === "number") {
        setOnlineCount(count);
      } else {
        setOnlineCount(allMembers.length);
      }
    }

    // When a new user joins the room
    function onMemberJoined(newMember) {
      if (!isComponentMounted) return;

      setMembers((currentMembers) => {
        // Don't add if they're already in our list
        const alreadyExists = currentMembers.some((member) => member.id === newMember.id);
        if (alreadyExists) {
          return currentMembers;
        }

        // Show a system message that someone joined
        addMessage({
          id: `sys-join-${newMember.id}-${Date.now()}`,
          type: "system",
          text: `${newMember.displayName} joined the network`,
          time: Date.now(),
        });

        // Add them to our member list
        return [...currentMembers, newMember];
      });
    }

    // When a user leaves the room
    function onMemberLeft({ id: leftMemberId }) {
      if (!isComponentMounted) return;

      setMembers((currentMembers) => {
        // Find who left (to show their name in the system message)
        const leftMember = currentMembers.find((member) => member.id === leftMemberId);

        if (leftMember) {
          // Show a system message that someone left
          addMessage({
            id: `sys-left-${leftMemberId}-${Date.now()}`,
            type: "system",
            text: `${leftMember.displayName} left the network`,
            time: Date.now(),
          });
        }

        // Remove them from our member list
        return currentMembers.filter((member) => member.id !== leftMemberId);
      });
    }

    // When we receive an encrypted message from another user
    function onMessage(payload) {
      if (!isComponentMounted) return;

      try {
        // Decrypt the message using our room key
        const messageText = decryptMessage(
          roomKeyRef.current,
          payload.ciphertext,
          payload.iv
        );

        // Add the decrypted message to the screen
        addMessage({
          id: `${payload.senderId}-${payload.timestamp}`,
          type: "chat",
          sender: payload.senderId,
          text: messageText,
          time: payload.timestamp,
        });
      } catch (error) {
        console.error("Failed to decrypt message:", error);
      }
    }

    // When another user is typing
    function onTyping(data) {
      if (!isComponentMounted) return;

      const typingUserName = data.displayName;
      const typingUserId = data.id;

      // Add this user to the "currently typing" list (if not already there)
      setTypingUsers((currentTyping) => {
        const alreadyTyping = currentTyping.find((user) => user.id === typingUserId);
        if (alreadyTyping) {
          return currentTyping; // Already in the list, don't add again
        }
        return [...currentTyping, { id: typingUserId, displayName: typingUserName }];
      });

      // Remove the typing indicator after 2 seconds
      setTimeout(() => {
        setTypingUsers((currentTyping) =>
          currentTyping.filter((user) => user.id !== typingUserId)
        );
      }, 2000);
    }

    // ── Register All Event Listeners ──
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectionError);
    socket.on("network-joined", onNetworkJoined);
    socket.on("members-update", onMembersUpdate);
    socket.on("member-joined", onMemberJoined);
    socket.on("member-left", onMemberLeft);
    socket.on("message", onMessage);
    socket.on("typing", onTyping);

    // ── Connect to the Server ──
    if (socket.connected) {
      // Already connected (e.g., hot module reload during development)
      onConnect();
    } else {
      socket.connect();
    }

    // ── Cleanup Function ──
    // Runs when the component is removed from the page
    return () => {
      isComponentMounted = false;

      // Remove all event listeners to prevent memory leaks
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectionError);
      socket.off("network-joined", onNetworkJoined);
      socket.off("members-update", onMembersUpdate);
      socket.off("member-joined", onMemberJoined);
      socket.off("member-left", onMemberLeft);
      socket.off("message", onMessage);
      socket.off("typing", onTyping);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tab Visibility & Focus Re-sync ──
  // When the user switches back to this tab, check if we need to reconnect
  useEffect(() => {
    function onTabBecameVisible() {
      // Only do something when the tab becomes visible
      if (document.visibilityState !== "visible") return;
      if (!socketRef.current) return;

      if (!socketRef.current.connected) {
        // We lost connection while the tab was hidden — reconnect
        socketRef.current.connect();
      } else {
        // We're still connected — just re-announce ourselves
        // (in case the server lost track of us)
        socketRef.current.emit("join-network", { displayName });
      }
    }

    // Listen for tab visibility changes AND window focus events
    document.addEventListener("visibilitychange", onTabBecameVisible);
    window.addEventListener("focus", onTabBecameVisible);

    // Cleanup: remove event listeners
    return () => {
      document.removeEventListener("visibilitychange", onTabBecameVisible);
      window.removeEventListener("focus", onTabBecameVisible);
    };
  }, [displayName]);

  // ── Send a Message ──
  // Called when the user submits the message form
  function sendMessage(event) {
    event.preventDefault(); // Prevent the form from reloading the page

    const messageText = draft.trim(); // Remove extra spaces

    // Don't send empty messages or if we're not connected
    if (!messageText || !connected) return;

    // Encrypt the message before sending
    const encryptedData = encryptMessage(roomKeyRef.current, messageText);

    // Send the encrypted message to the server
    socketRef.current.emit("send-message", {
      ciphertext: encryptedData.ciphertext,
      iv: encryptedData.iv,
    });

    // Show the message on our own screen (we know what we typed, no need to decrypt)
    addMessage({
      id: `me-${Date.now()}`,
      type: "chat",
      sender: "you",
      text: messageText,
      time: Date.now(),
    });

    // Clear the input field and refocus it
    setDraft("");
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }

  // ── Handle Typing Indicator ──
  // Called every time the user types a character
  // Uses a timer to avoid sending too many "typing" events
  function onUserTyping() {
    // If we already sent a "typing" event recently, don't send another one
    if (typingTimerRef.current) return;

    // Send "typing" event to the server
    if (socketRef.current) {
      socketRef.current.emit("typing", { displayName });
    }

    // Set a cooldown timer — don't send another "typing" event for 2 seconds
    typingTimerRef.current = setTimeout(() => {
      typingTimerRef.current = null; // Allow sending "typing" again
    }, 2000);
  }

  // ── Get a Sender's Display Name ──
  // Looks up a sender's name from the member list
  function getSenderName(senderId) {
    if (senderId === "you") {
      return displayName; // It's us!
    }

    // Find this sender in the member list
    const member = members.find((m) => m.id === senderId);
    if (member) {
      return member.displayName;
    }

    return "unknown"; // Couldn't find them (they might have disconnected)
  }

  // Calculate total online users (use server count if available, otherwise estimate)
  const totalOnline = onlineCount > 0 ? onlineCount : members.length + 1;

  // =============================================
  // RENDER THE UI
  // =============================================
  return (
    <div className="shell">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          {/* WiFi icon */}
          <svg className="wifi-svg" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="20" r="1" fill="currentColor" />
          </svg>
          <span className="header-title">Local Network</span>
        </div>

        {/* Online user count badge */}
        <div className="peer-badge">
          <svg viewBox="0 0 24 24" fill="none" className="peer-icon">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{totalOnline}</span>
        </div>
      </header>

      {/* ── Connection Status Bar ── */}
      <div className={`status-bar ${connected ? "status-ok" : "status-connecting"}`}>
        <span className="status-dot" />
        {!connected
          ? "Connecting to server…"
          : joining
            ? "Joining network…"
            : `Connected · ${totalOnline} peer${totalOnline !== 1 ? "s" : ""} online`}
      </div>

      {/* ── Messages Area ── */}
      <div className="messages">
        {/* Show empty state when there are no messages */}
        {messages.length === 0 && !joining && (
          <div className="empty">
            <p className="empty-title">End-to-end encrypted</p>
            <p className="empty-sub">
              Messages are ephemeral and never stored on any server.
            </p>
          </div>
        )}

        {/* Render each message */}
        {messages.map((message) => {
          // System messages (join/leave notifications)
          if (message.type === "system") {
            return (
              <div key={message.id} className="sys-msg">
                <span>{message.text}</span>
              </div>
            );
          }

          // Chat messages
          const senderName = getSenderName(message.sender);

          return (
            <div key={message.id} className="msg-block">
              <div className="msg-sender">&lt;@{senderName}&gt;</div>
              <div className="bubble">
                <span className="bubble-text">{message.text}</span>
                <div className="bubble-footer">
                  <span className="bubble-time">{formatTime(message.time)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="typing-row">
            <div className="typing-bubble">
              <span className="typing-name">{typingUsers[0].displayName}</span>
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}

        {/* Invisible element at the bottom — used for auto-scrolling */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Message Input Bar ── */}
      <form className="input-bar" onSubmit={sendMessage}>
        <label className="input-wrap">
          <input
            ref={inputRef}
            className="input-field"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            placeholder="Message..."
            value={draft}
            disabled={!connected}
            onChange={(event) => {
              setDraft(event.target.value);
              onUserTyping();
            }}
          />
        </label>

        {/* Send button — uses text arrow instead of SVG icon */}
        <button
          type="submit"
          className="send-btn"
          disabled={!draft.trim() || !connected}
          aria-label="Send"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
