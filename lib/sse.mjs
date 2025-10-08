// lib/sse.mjs
// SSE (Server-Sent Events) utilities following MDN standard
// Includes heartbeat, no-buffering headers, AbortController support

export function open(res) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable nginx buffering
  res.flushHeaders?.();
}

export function send(res, event, data) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  res.write(`event: ${event}\n`);
  res.write(`data: ${payload}\n\n`);
}

export function heartbeat(res) {
  res.write(': ping\n\n'); // Comment line for keep-alive
}

export function tick(res) { send(res, "tick", Date.now()); }
export function note(res, data) { send(res, "note", data); }
export function warn(res, data) { send(res, "warn", data); }
export function enrich(res, data) { send(res, "enrich", data); }
export function done(res) { send(res, "done", ""); }

