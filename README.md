# 📡 Local Network Chat — Encrypted, Ephemeral Group Chat

A **real-time encrypted chat application** that works over your **local network (LAN/WiFi)**. Messages are encrypted end-to-end — the server never sees your actual messages. All messages are ephemeral (temporary) and auto-delete after 5 minutes.

---

## 📋 Table of Contents

- [What is This Project?](#what-is-this-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Architecture](#project-architecture)
- [Folder Structure](#folder-structure)
- [How It Works — Step by Step](#how-it-works--step-by-step)
- [How Encryption Works](#how-encryption-works)
- [Socket Events — Complete List](#socket-events--complete-list)
- [How to Run](#how-to-run)
- [File-by-File Explanation](#file-by-file-explanation)
- [Interview Questions & Answers](#interview-questions--answers)

---

## What is This Project?

This is a **local network group chat app**. Think of it like WhatsApp, but:

- It only works on your **local WiFi/hotspot** (not the internet)
- Messages are **encrypted** before sending — the server can't read them
- Messages **auto-delete** after 5 minutes — nothing is stored
- No login required — you get an **anonymous name** like `anon4521`
- The server is just a **relay** — it forwards encrypted data between users

**Use case:** Private, temporary communication between devices on the same network (e.g., in a classroom, office, or home).

---

## Features

| Feature | Description |
|---------|-------------|
| 🔐 End-to-End Encryption | XSalsa20-Poly1305 encryption using TweetNaCl |
| ⏱️ Ephemeral Messages | Auto-delete after 5 minutes |
| 👥 Real-time Member Count | See who's online |
| ⌨️ Typing Indicators | See when someone is typing |
| 🔄 Auto-Reconnection | Reconnects automatically if connection drops |
| 📱 Responsive Design | Works on desktop, tablet, and mobile |
| 🌐 LAN Access | Any device on the same WiFi can join |
| 🚫 Zero Storage | Server never stores messages or user data |

---

## Tech Stack

### Server (Backend)
| Technology | Purpose |
|------------|---------|
| **Node.js** | JavaScript runtime for the server |
| **Socket.IO** | Real-time bidirectional communication (WebSockets) |
| **HTTP** | Basic HTTP server for health checks |

### Web (Frontend)
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework for the web app |
| **React 18** | UI component library |
| **Socket.IO Client** | Connects to the server from the browser |
| **TweetNaCl** | Encryption/decryption library (XSalsa20-Poly1305) |
| **TweetNaCl-util** | Helper functions for encoding/decoding |

---

## Project Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        LOCAL NETWORK (WiFi)                      │
│                                                                  │
│  ┌──────────┐     Encrypted Messages     ┌──────────┐           │
│  │ Browser  │ ◄──────────────────────────►│  Node.js │           │
│  │ (Next.js)│     (ciphertext + iv)       │  Server  │           │
│  │ Port 3000│                             │ Port 4000│           │
│  └──────────┘                             └──────────┘           │
│       │                                        ▲                 │
│       │  Encrypt/Decrypt                       │                 │
│       │  with TweetNaCl                        │  Only relays    │
│       │                                        │  encrypted data │
│       ▼                                        │                 │
│  ┌──────────┐                             ┌──────────┐           │
│  │  User    │                             │  Rooms   │           │
│  │  sees    │                             │  (memory │           │
│  │ plaintext│                             │   only)  │           │
│  └──────────┘                             └──────────┘           │
│                                                                  │
│  ┌──────────┐     Encrypted Messages       ┌─────────┐           │
│  │ Phone    │ ◄──────────────────────────► │  Server │           │
│  │ Browser  │     (same process)           │  (same) │           │ 
│  └──────────┘                              └─────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow — Sending a Message

```
You type "Hello"
       │
       ▼
┌─────────────────┐
│ 1. Encrypt       │  "Hello" → { ciphertext: "x7Kj...", iv: "mN3..." }
│    (in browser)  │  Using XSalsa20-Poly1305 + room key
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ 2. Send to       │  Socket.IO emits "send-message" event
│    Server        │  Server receives: { ciphertext, iv }
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ 3. Server        │  Server CANNOT read the message!
│    Relays        │  It just forwards { ciphertext, iv } to all other users
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ 4. Other users   │  { ciphertext: "x7Kj...", iv: "mN3..." } → "Hello"
│    Decrypt       │  Using the same room key
└─────────────────┘
```

---

## Folder Structure

```
local_network/
├── server/                     # Backend (Node.js + Socket.IO)
│   ├── index.js                # Main server file — handles connections & relays messages
│   ├── rooms.js                # Room & member management (in-memory only)
│   ├── package.json            # Server dependencies
│   └── node_modules/           # Installed packages
│
├── web/                        # Frontend (Next.js + React)
│   ├── app/
│   │   ├── page.js             # Main chat page — UI + socket logic
│   │   ├── layout.js           # Root HTML layout (loads fonts, CSS)
│   │   └── globals.css         # All styles for the app
│   ├── lib/
│   │   ├── socket.js           # Socket.IO connection setup (singleton)
│   │   └── crypto.js           # Encryption/decryption functions
│   ├── test/
│   │   └── socket.test.js      # Unit tests for socket URL detection
│   ├── next.config.js          # Next.js settings (LAN access)
│   ├── package.json            # Frontend dependencies
│   └── node_modules/           # Installed packages
│
└── README.md                   # This file
```

---

## How It Works — Step by Step

### 1. Starting the App
1. You run the **server** on port `4000` → It creates a Socket.IO server
2. You run the **web app** on port `3000` → It starts a Next.js dev server
3. Both listen on `0.0.0.0` so any device on the LAN can connect

### 2. User Opens the Chat
1. Browser loads the page from `http://<your-ip>:3000`
2. The app generates a random anonymous name (e.g., `anon4521`)
3. The name is saved in `localStorage` so it persists across refreshes
4. The app connects to the Socket.IO server at `http://<your-ip>:4000`

### 3. Joining the Room
1. Browser sends a `"join-network"` event with the display name
2. Server adds the user to the `"local-network"` room
3. Server sends back the list of existing members
4. Server notifies all other users that someone new joined

### 4. Sending a Message
1. User types a message and hits Send
2. The message is **encrypted** in the browser using XSalsa20-Poly1305
3. Only the encrypted data (`ciphertext` + `iv`) is sent to the server
4. Server relays the encrypted data to all other users in the room
5. Each receiving browser **decrypts** the message using the shared room key
6. The message appears on screen and auto-deletes after 5 minutes

### 5. Disconnecting
1. When a user closes the browser or loses connection, Socket.IO detects it
2. Server removes them from the room
3. Server notifies remaining users that someone left

---

## How Encryption Works

### Key Derivation
```
Room Code: "local-network"
     │
     ▼
Add salt: "local-network:bitchat-lite-salt"
     │
     ▼
SHA-512 hash → 64 bytes
     │
     ▼
Take first 32 bytes → Encryption Key
```

**Important:** Everyone in the same room derives the **same key** from the room code. This is how group encryption works — it's not person-to-person, it's room-level.

### Encryption (Sending)
```
Plaintext: "Hello everyone!"
     │
     ▼
Generate random 24-byte nonce
     │
     ▼
XSalsa20-Poly1305 secretbox(plaintext, nonce, key)
     │
     ▼
Output: { ciphertext: "base64...", iv: "base64..." }
```

### Decryption (Receiving)
```
Input: { ciphertext: "base64...", iv: "base64..." }
     │
     ▼
Decode Base64 → bytes
     │
     ▼
XSalsa20-Poly1305 secretbox.open(ciphertext, nonce, key)
     │
     ▼
Output: "Hello everyone!"
```

---

## Socket Events — Complete List

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `join-network` | `{ displayName }` | User wants to join the chat room |
| `send-message` | `{ ciphertext, iv, targetId? }` | Send an encrypted message (broadcast or DM) |
| `typing` | `{ displayName }` | User is currently typing |
| `emergency-wipe` | _(none)_ | Immediately leave and clear presence |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `network-joined` | `{ members, count }` | Confirms you joined; lists existing members |
| `members-update` | `{ members, count }` | Updated member list for everyone |
| `member-joined` | `{ id, displayName }` | A new user joined the room |
| `member-left` | `{ id }` | A user left the room |
| `message` | `{ senderId, ciphertext, iv, timestamp }` | Encrypted message from another user |
| `typing` | `{ displayName, id }` | Another user is typing |

---

## How to Run

### Prerequisites
- **Node.js** (v18 or higher)
- Two devices on the **same WiFi/hotspot** (or just use two browser tabs)

### Step 1: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install web app dependencies
cd ../web
npm install
```

### Step 2: Start the Server

```bash
cd server
npm run dev
```

You should see: `✅ Chat server is running on http://0.0.0.0:4000`

### Step 3: Start the Web App

```bash
cd web
npm run dev
```

You should see: `✓ Ready on http://localhost:3000`

### Step 4: Open in Browser

- **Same computer:** Open `http://localhost:3000`
- **Another device on WiFi:** Open `http://<your-computer-ip>:3000`
  - Find your IP: Run `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

### Step 5: Run Tests

```bash
cd web
node --test test/socket.test.js
```

---

## File-by-File Explanation

### `server/index.js` — Main Server

The heart of the backend. It does 3 things:
1. **Creates an HTTP server** with a `/health` endpoint for debugging
2. **Creates a Socket.IO server** on top of it for real-time communication
3. **Handles socket events:** join, send-message, typing, disconnect, emergency-wipe

**Key concept:** The server is a **relay** — it forwards encrypted data between users without ever reading it.

### `server/rooms.js` — Room Management

Manages who is in which room using JavaScript `Map` objects:
- `addMember()` — Adds a user to a room
- `removeMember()` — Removes a user; deletes room if empty
- `getMembers()` — Returns list of all users in a room
- `hasMember()` — Checks if a user is already in a room
- `findRoomBySocket()` — Finds which room a user is in (used on disconnect)
- `roomStats()` — Returns debug info about all rooms

**Key concept:** Everything is in-memory. Server restart = all data gone. This is intentional for privacy.

### `web/lib/crypto.js` — Encryption

Three functions:
- `deriveRoomKey(roomCode)` — Creates a 32-byte encryption key from the room name
- `encryptMessage(key, plaintext)` — Encrypts a message → returns `{ ciphertext, iv }`
- `decryptMessage(key, ciphertext, iv)` — Decrypts back to plaintext

**Key concept:** Uses TweetNaCl's `secretbox` (XSalsa20-Poly1305). Anyone with the room code can derive the same key.

### `web/lib/socket.js` — Socket Connection

Two functions:
- `getServerUrl()` — Detects whether to connect to `localhost` or a LAN IP
- `getSocket()` — Returns a singleton Socket.IO connection (created once, reused everywhere)

**Key concept:** Singleton pattern prevents creating duplicate connections.

### `web/app/page.js` — Chat UI

The main React component. Handles:
- Connecting to the server and joining the room
- Encrypting and sending messages
- Receiving and decrypting messages
- Showing who's online and who's typing
- Auto-deleting messages after 5 minutes
- Reconnecting when the browser tab regains focus

### `web/app/layout.js` — Root Layout

Next.js root layout that wraps every page with HTML structure, loads the Inter font, and imports global CSS.

### `web/app/globals.css` — Styles

All CSS for the chat UI: header, status bar, message bubbles, typing indicator, input bar, and responsive breakpoints.

### `web/next.config.js` — Next.js Config

Enables strict mode and whitelists LAN IP ranges so other devices can access the dev server.

---

## Interview Questions & Answers

### 🟢 Beginner Level

**Q1: What is Socket.IO and why is it used here?**

**A:** Socket.IO is a library that enables real-time, bidirectional communication between a browser and a server. Unlike regular HTTP (where the browser sends a request and waits for a response), Socket.IO keeps a persistent connection open. This means the server can **push** data to the browser instantly without the browser asking for it. In this project, we use it so chat messages appear immediately on all connected devices.

---

**Q2: What is the difference between `useState` and `useRef` in React?**

**A:**
- `useState` stores values that, when changed, cause the component to **re-render** (redraw the UI). Example: `messages` — when a new message arrives, the screen needs to update.
- `useRef` stores values that persist across re-renders **without** causing re-renders. Example: `socketRef` — the socket connection doesn't change, and changing it shouldn't redraw the UI.

---

**Q3: Why do messages auto-delete after 5 minutes?**

**A:** This is an intentional privacy feature. The app is designed for **ephemeral** (temporary) communication. Messages are never stored on the server, and they're also removed from the browser after 5 minutes. This is implemented using `setTimeout` — when a message is added, a timer is started that removes it from the state array after `MESSAGE_LIFETIME` (5 * 60 * 1000 milliseconds).

---

**Q4: What does `"use client"` mean at the top of `page.js`?**

**A:** In Next.js, components run on the server by default (Server Components). Adding `"use client"` tells Next.js that this component needs to run in the **browser** because it uses browser-only features like `useState`, `useEffect`, `localStorage`, and Socket.IO. Without this directive, the component would fail because these APIs don't exist on the server.

---

**Q5: Why does `getSocket()` use a singleton pattern?**

**A:** A singleton ensures only **one** Socket.IO connection exists for the entire app. Without it, every time `getSocket()` is called (which happens on every component render), a new connection would be created, leading to hundreds of duplicate connections and performance problems. The singleton pattern stores the connection in a module-level variable and returns the same instance every time.

---

### 🟡 Intermediate Level

**Q6: How does the encryption key derivation work?**

**A:** The room code (like `"local-network"`) is combined with a salt string (`":bitchat-lite-salt"`) and hashed using SHA-512. SHA-512 produces 64 bytes of output, but we only need 32 bytes for the XSalsa20 encryption key, so we take the first 32 bytes using `.slice(0, 32)`. This is a form of **key derivation** — turning a human-readable password into a fixed-length cryptographic key. The salt prevents the same room code from producing the same key as another application using the same hash.

---

**Q7: What is a nonce (iv) and why is it important?**

**A:** A nonce ("number used once") is a random 24-byte value generated for each message. It ensures that encrypting the **same message twice** produces **different ciphertext**. Without a nonce, an attacker could detect when the same message is sent repeatedly. The nonce is sent alongside the ciphertext (it's not secret) because the receiver needs it to decrypt the message. We call it `iv` (initialization vector) in the wire format, which is a similar concept.

---

**Q8: Explain the `mounted` flag pattern in the `useEffect` hook.**

**A:**
```javascript
let isComponentMounted = true;
// ... setup code ...
return () => { isComponentMounted = false; };
```
This prevents a React error called "state update on an unmounted component." If the component is removed from the page (e.g., navigating away), but an async operation (like a socket event) tries to call `setState`, React throws a warning. The `isComponentMounted` flag lets us check: "Is this component still on the page?" before updating state. Each event handler checks `if (!isComponentMounted) return;` at the start.

---

**Q9: Why does the server use `0.0.0.0` instead of `localhost`?**

**A:** `localhost` (or `127.0.0.1`) only accepts connections from the **same machine**. `0.0.0.0` means "listen on **all network interfaces**" — including the WiFi adapter. This is essential because we want other devices on the same WiFi network to connect to the server. Without `0.0.0.0`, a phone on the same WiFi couldn't reach the server.

---

**Q10: How does the app handle reconnection when the user switches browser tabs?**

**A:** There's a `useEffect` that listens for two events:
1. `visibilitychange` — fires when the tab becomes visible/hidden
2. `focus` — fires when the window gains focus

When either fires, the handler checks if the socket is still connected. If not, it calls `socket.connect()` to reconnect. If it is connected, it re-emits `"join-network"` to refresh its presence with the server (in case the server timed out and removed it during the tab switch).

---

### 🔴 Advanced Level

**Q11: What is XSalsa20-Poly1305 and why was it chosen over AES?**

**A:** XSalsa20-Poly1305 is an **authenticated encryption** algorithm from the NaCl (Networking and Cryptography Library) family:
- **XSalsa20** is the encryption cipher (encrypts/decrypts data)
- **Poly1305** is the MAC (Message Authentication Code — verifies the message wasn't tampered with)

It was chosen over AES-GCM because:
1. **No secure context needed:** The Web Crypto API (which provides AES) requires HTTPS. This app runs on HTTP over a local network. TweetNaCl works in any context.
2. **Simpler API:** NaCl's `secretbox` is a single function call. AES-GCM requires multiple steps and configuration.
3. **No side-channel attacks:** XSalsa20 is designed to run in constant time on all platforms, making it resistant to timing attacks.

---

**Q12: What are the security limitations of this approach?**

**A:**
1. **Shared key weakness:** Everyone with the room code can derive the key. There's no per-user authentication. If someone knows the room code, they can read all messages.
2. **No forward secrecy:** If the key is compromised, all past and future messages using that key can be decrypted. A more secure system would use Diffie-Hellman key exchange for each session.
3. **No identity verification:** Users can claim any display name. There are no digital signatures to verify who sent a message.
4. **Client-side key derivation:** The key is derived in the browser using JavaScript, which is a less secure environment than native code.
5. **In-memory only:** While messages aren't stored on the server, they exist in browser memory and could be accessed via browser dev tools.

---

**Q13: How does the room management prevent memory leaks on the server?**

**A:** The `removeMember()` function in `rooms.js` checks if a room is empty after removing a member:
```javascript
if (room.members.size === 0) {
  rooms.delete(roomCode);
}
```
Without this cleanup, the `rooms` Map would grow indefinitely as rooms are created but never deleted. Additionally, since `rooms` is a `Map` (not a plain object), it handles garbage collection properly when entries are deleted.

---

**Q14: Explain the event-driven architecture of this application.**

**A:** The app follows a **publish-subscribe (pub/sub) pattern** through Socket.IO:

1. **Publisher:** The client emits events (e.g., `"send-message"`)
2. **Broker:** The Socket.IO server receives events and relays them
3. **Subscribers:** Other connected clients receive the relayed events

This is different from a traditional REST API where the client polls for updates. Here, the server **pushes** updates to all relevant clients in real-time. The server maintains a list of "rooms," and when an event needs to be broadcast, it uses `io.to(ROOM_CODE).emit()` to send it to all sockets subscribed to that room.

Socket.IO also handles:
- **Transport fallback:** Uses WebSocket if available, falls back to HTTP long-polling
- **Automatic reconnection:** Reconnects with exponential backoff
- **Heartbeat:** Sends ping/pong to detect dead connections

---

**Q15: Why does `useCallback` wrap the `addMessage` function?**

**A:** `useCallback` memoizes the function so it maintains the same reference across re-renders. Without it, a new `addMessage` function would be created on every render. This matters because `addMessage` is used inside other `useEffect` hooks and event handlers — if its reference changed on every render, those effects would re-run unnecessarily, potentially causing infinite loops or duplicate event listeners. The empty dependency array `[]` means the function is created once and never recreated.

---

**Q16: How would you scale this application beyond a single server?**

**A:**
1. **Horizontal scaling with Redis adapter:** Socket.IO has a Redis adapter that allows multiple server instances to share state. When server A emits to a room, the message is published to Redis, and server B (which has other clients in the room) receives and forwards it.
2. **Persistent room state:** Replace the in-memory `Map` with Redis or a database for room membership, so it survives server restarts.
3. **Load balancer:** Use Nginx or HAProxy with sticky sessions (needed for WebSocket upgrade handshakes).
4. **Message queue:** Add a message broker like RabbitMQ or Kafka for reliable message delivery and ordering.
5. **Microservices:** Separate the relay server, room management, and encryption into independent services.

---

**Q17: What is the purpose of the `emergency-wipe` event?**

**A:** It provides a way for a user to **immediately** leave the chat room and remove all traces of their presence. Unlike a normal disconnect (which might be delayed due to Socket.IO's `pingTimeout`), the emergency wipe:
1. Removes the user from the room data structure **immediately**
2. Notifies all other users that the person left
3. Leaves the Socket.IO room
4. Updates the member count for everyone

This is useful for privacy-sensitive situations where the user needs to disappear instantly rather than waiting for the connection timeout.

---

**Q18: How does the typing indicator work without flooding the server?**

**A:** The typing indicator uses a **throttle pattern**:
1. When the user types a character, `onUserTyping()` is called
2. It checks if `typingTimerRef.current` exists (a cooldown timer)
3. If no timer exists: emit the `"typing"` event and start a 2-second timer
4. If a timer exists: do nothing (skip the event)
5. After 2 seconds: the timer clears itself, allowing the next "typing" event

On the receiving side, each "typing" event adds the user to `typingUsers` and sets a 2-second timeout to remove them. This means the typing indicator appears for 2 seconds after the last keystroke and then disappears automatically.

---

## License

This project is for educational purposes. Feel free to use, modify, and learn from it.
