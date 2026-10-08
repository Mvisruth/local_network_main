// =============================================
// layout.js — Root Layout for the App
// =============================================
//
// WHAT THIS FILE DOES:
// - Wraps every page with the basic HTML structure (<html>, <head>, <body>)
// - Loads the global CSS styles
// - Loads the "Inter" font from Google Fonts
// - Sets page metadata (title and description shown in browser tab)
//
// In Next.js, this file is the "shell" that wraps all pages.
// Think of it like the outer frame of every page.

import "./globals.css";

// ── Page Metadata ──
// This sets the browser tab title and the description for search engines
export const metadata = {
  title: "Local Network",
  description: "Encrypted, ephemeral group chat over the local network.",
  icons: {
    icon: "/image.png",
    shortcut: "/image.png",
    apple: "/image.png",
  },
};

// ── Root Layout Component ──
// "children" is whatever page content Next.js is rendering (e.g., our chat page)
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Make the page responsive on mobile devices */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Load the "Inter" font from Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
