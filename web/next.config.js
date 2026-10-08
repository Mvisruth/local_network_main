// =============================================
// next.config.js — Next.js Configuration
// =============================================
//
// WHAT THIS FILE DOES:
// - Configures how Next.js builds and runs the web app
// - Allows devices on the local network (LAN) to access the dev server
//
// WHY "allowedDevOrigins"?
// When you run "npm run dev", Next.js only allows connections from "localhost" by default.
// Since we want other devices on the same WiFi to connect (phones, tablets, etc.),
// we need to whitelist their IP address ranges.
//
// Common LAN IP ranges:
//   192.168.x.x  — Most home routers
//   10.x.x.x     — Some enterprise/hotspot networks
//   172.16.x.x   — Less common, but still used

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode catches common React bugs during development
  reactStrictMode: true,

  // Allow these IP address patterns to access the dev server
  allowedDevOrigins: [
    "192.168.31.56",    // A specific device (you can remove this)
    "192.168.31.*",     // Any device on the 192.168.31.x subnet
    "192.168.*.*",      // Any device on any 192.168.x.x subnet
    "10.*.*.*",         // Any device on 10.x.x.x networks
    "172.16.*.*",       // Any device on 172.16.x.x networks
  ],
};

module.exports = nextConfig;
