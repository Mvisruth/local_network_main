#  Local Network Chat — Encrypted, Ephemeral Group Chat

A **real-time encrypted chat application** that works over your **local network (LAN/WiFi)**. Messages are encrypted end-to-end — the server never sees your actual messages. All messages are ephemeral (temporary) and auto-delete after 5 minutes.

---

##  Table of Contents

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
|  End-to-End Encryption | XSalsa20-Poly1305 encryption using TweetNaCl |
|  Ephemeral Messages | Auto-delete after 5 minutes |
|  Real-time Member Count | See who's online |
|  Typing Indicators | See when someone is typing |
|  Auto-Reconnection | Reconnects automatically if connection drops |
|  Responsive Design | Works on desktop, tablet, and mobile |
|  LAN Access | Any device on the same WiFi can join |
|  Zero Storage | Server never stores messages or user data |

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


## License

This project is for educational purposes. Feel free to use, modify, and learn from it.
