// =============================================
// socket.test.js — Tests for the Socket Module
// =============================================
//
// WHAT THIS FILE DOES:
// - Tests that getServerUrl() returns the correct server URL
// - Test 1: When running in Node.js (no browser), it should return localhost
// - Test 2: When running in a browser on the LAN, it should use the browser's IP
//
// HOW TO RUN:
//   node --test test/socket.test.js

import test from "node:test";                  // Built-in Node.js test runner
import assert from "node:assert/strict";       // Built-in assertion library
import { getServerUrl } from "../lib/socket.js";

// ── Test 1: Default URL (no browser) ──
// When there's no browser "window" object, getServerUrl should return localhost
test("returns localhost by default when no browser window exists", () => {
  const result = getServerUrl();
  assert.equal(result, "http://localhost:4000");
});

// ── Test 2: LAN URL (simulated browser) ──
// When running in a browser on a LAN device, it should use that device's IP address
test("uses the browser host when running on the LAN", () => {
  // Save the original window object (it might not exist in Node.js)
  const originalWindow = global.window;

  // Fake a browser environment by creating a mock "window" object
  global.window = {
    location: {
      protocol: "http:",
      hostname: "192.168.31.56",
    },
  };

  try {
    // Now getServerUrl() should use the fake browser's hostname
    const result = getServerUrl();
    assert.equal(result, "http://192.168.31.56:4000");
  } finally {
    // IMPORTANT: Always restore the original window, even if the test fails
    // "finally" runs no matter what — this prevents breaking other tests
    if (originalWindow === undefined) {
      delete global.window;  // Remove the fake window we created
    } else {
      global.window = originalWindow;  // Restore the real one
    }
  }
});

