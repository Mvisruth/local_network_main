# Local Network Chat

A **real-time, end-to-end encrypted group chat application** designed for local networks (LAN / Wi-Fi). Messages are encrypted directly in the browser and auto-delete after 5 minutes. The server operates strictly as an in-memory relay and never has access to plaintext messages or encryption keys.

---

## Features

- **End-to-End Encryption (E2EE):** Encrypted in the browser using TweetNaCl (XSalsa20-Poly1305).
- **Ephemeral Messages:** All messages automatically expire and delete after 5 minutes.
- **Zero Server Storage:** Messages and membership reside purely in volatile memory. No database or disk logs.
- **Anonymous Identity:** Generates anonymous usernames automatically with persistent local session support.
- **LAN Accessible:** Accessible from any device (phone, laptop, tablet) on the same Wi-Fi or hotspot.
- **Real-Time Indicators:** Live member counts, join/leave updates, and typing indicators via WebSockets.

---

## Tech Stack

### Frontend (`web/`)
- **Framework:** Next.js 14 (App Router) & React 18
- **Cryptography:** TweetNaCl & TweetNaCl-util (XSalsa20-Poly1305 + SHA-512)
- **Communication:** Socket.IO Client

### Backend (`server/`)
- **Runtime:** Node.js
- **Server:** Express & Socket.IO (WebSocket relay)

---

## How It Works

1. **Key Derivation:** When entering a room, a shared 32-byte encryption key is derived locally using SHA-512 hashing on the room code and application salt.
2. **Client-Side Encryption:** When a user sends a message, a random 24-byte nonce is generated, and the text is encrypted using XSalsa20-Poly1305 before leaving the browser.
3. **Relay Only:** The Node.js server receives only the ciphertext and nonce (`iv`), forwarding them to connected peers without decrypting or storing anything.
4. **Decryption & Expiry:** Peers decrypt the ciphertext using their locally derived key. Messages self-destruct after 5 minutes.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- Two or more devices connected to the same Wi-Fi / hotspot (or multiple browser tabs)

### 1. Install Dependencies

```bash
# Server dependencies
cd server
npm install

# Frontend dependencies
cd ../web
npm install
```

### 2. Start the Server

```bash
cd server
npm run dev
```
The server will start on port `4000` (listening on `0.0.0.0:4000`).

### 3. Start the Web Client

```bash
cd web
npm run dev
```
The client will start on port `3000` (listening on `0.0.0.0:3000`).

### 4. Open and Chat

- **On your machine:** Visit `http://localhost:3000`
- **From another device on your network:** Visit `http://<your-computer-ip>:3000`
  - *Find your IP:* Run `ipconfig` (Windows) or `ifconfig` / `ip a` (macOS/Linux).

---

## Running Tests

```bash
cd web
node --test test/socket.test.js
```
