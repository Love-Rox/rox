/**
 * Frontend Production Start Script
 *
 * Sets process title and starts Waku server.
 */

// Set process title for top/ps visibility
process.title = "waku-rox";

// Get port from environment or use default
const port = process.env.FRONTEND_PORT || "3001";

// Import and start waku programmatically
const { spawn } = await import("bun");

// Start waku using CLI (waku start doesn't have a programmatic API)
const proc = spawn({
  cmd: ["bunx", "waku", "start", "-p", port],
  cwd: import.meta.dir,
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});

// Wait for process to exit
const exitCode = await proc.exited;
process.exit(exitCode);
