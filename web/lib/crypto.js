// =============================================
// crypto.js — Message Encryption & Decryption
// =============================================
//
// WHAT THIS FILE DOES:
// - Encrypts messages BEFORE sending them to the server
// - Decrypts messages received FROM the server
// - The server NEVER sees the actual message text — only encrypted gibberish
//
// HOW ENCRYPTION WORKS (simplified):
// 1. Everyone in the same room shares a "secret key" (derived from the room name)
// 2. Before sending: message text → encrypt with key → send encrypted data
// 3. After receiving: encrypted data → decrypt with key → readable text
//
// TECHNOLOGY USED:
// - TweetNaCl library (a small, trusted encryption library)
// - XSalsa20-Poly1305 algorithm (very secure, very fast)
// - Works in ALL browsers, even without HTTPS

import nacl from "tweetnacl";
import { decodeUTF8, encodeBase64, decodeBase64 } from "tweetnacl-util";

// ── deriveRoomKey ──
// Creates a secret encryption key from the room name.
//
// HOW:
// 1. Take the room name (like "local-network")
// 2. Add a salt string to make it more unique: "local-network:chat-app-salt"
// 3. Hash it with SHA-512 (produces 64 random-looking bytes)
// 4. Use the first 32 bytes as our encryption key
//
// WHY 32 BYTES?
// The encryption algorithm (XSalsa20) needs exactly a 32-byte key.
//
// SECURITY NOTE:
// Anyone who knows the room name can derive the same key and read messages.
// This is by design — it's a shared group chat, not private messaging.
export function deriveRoomKey(roomCode) {
  // Step 1: Combine room code with a salt string
  const textToHash = roomCode + ":chat-app-salt";
  
  // Step 2: Convert the text string into bytes (computers work with bytes, not text)
  const bytesToHash = decodeUTF8(textToHash);  

  // Step 3: Hash it with SHA-512 (built into TweetNaCl)
  // This produces 64 bytes of hash output
  const hashResult = nacl.hash(bytesToHash);
  console.log(hashResult);
  
  

  // Step 4: Take only the first 32 bytes (that's all we need for the key)
  const encryptionKey = hashResult.slice(0, 32);
  console.log(encryptionKey);
  

  return encryptionKey;
}

// ── encryptMessage ──
// Takes plain text and encrypts it.
//
// INPUT:
//   key = the 32-byte encryption key (from deriveRoomKey)
//   plaintext = the message text (like "Hello everyone!")
//
// OUTPUT:
//   { ciphertext: "abc123...", iv: "xyz789..." }
//   Both values are Base64 encoded strings (safe to send over the network)
//
// WHAT IS A "NONCE" (iv)?
// A nonce is a random number used once. It ensures that encrypting the same
// message twice produces different outputs. The receiver needs it to decrypt.
// We call it "iv" in the network data for compatibility reasons.
export function encryptMessage(key, plaintext) {
  // Step 1: Generate a random 24-byte nonce (used once, never repeated)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength); // 24 bytes

  // Step 2: Convert the text message into bytes
  const messageBytes = decodeUTF8(plaintext);

  // Step 3: Encrypt the message bytes using the key and nonce
  const encryptedBytes = nacl.secretbox(messageBytes, nonce, key);

  // Step 4: Convert to Base64 strings (safe for sending over network)
  return {
    ciphertext: encodeBase64(encryptedBytes),  // The encrypted message
    iv: encodeBase64(nonce),                    // The nonce (needed for decryption)
  };
}

// ── decryptMessage ──
// Takes encrypted data and turns it back into readable text.
//
// INPUT:
//   key = the 32-byte encryption key (same key used to encrypt)
//   ciphertextB64 = the encrypted message (Base64 string)
//   nonceB64 = the nonce/iv (Base64 string)
//
// OUTPUT:
//   The original message text (like "Hello everyone!")
//
// THROWS:
//   Error if decryption fails (wrong key or message was tampered with)
export function decryptMessage(key, ciphertextB64, nonceB64) {
  // Step 1: Convert Base64 strings back into bytes
  const encryptedBytes = decodeBase64(ciphertextB64);
  
  const nonce = decodeBase64(nonceB64);

  // Step 2: Decrypt the bytes using the key and nonce
  const decryptedBytes = nacl.secretbox.open(encryptedBytes, nonce, key);

  // Step 3: Check if decryption was successful
  if (!decryptedBytes) {
    throw new Error("Decryption failed — wrong key or tampered message");
  }

  // Step 4: Convert bytes back into a readable text string
  const decoder = new TextDecoder();
  const messageText = decoder.decode(decryptedBytes);

  return messageText;
}
