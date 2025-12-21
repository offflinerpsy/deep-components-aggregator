SSE canon (MDN/WHATWG compliant):

- Headers (canonical):
	- Content-Type: text/event-stream; charset=utf-8
	- Cache-Control: no-cache, no-transform
	- Connection: keep-alive
	- X-Accel-Buffering: no
- Format: messages are delimited by a double newline (\n\n); heartbeat comments like `: ping` are allowed.
- Artifacts in this folder:
	- headers.txt — raw response headers captured from /api/live/search
	- stream.txt — first 100 lines of the SSE stream showing search:start, provider:partial|error, result, done

Anti-buffering requirement:
- Either the backend must send `X-Accel-Buffering: no` (preferred, present), or the proxy (nginx) must set `proxy_buffering off;` for the SSE location. Otherwise, the stream is buffered and delivered as a lump after a timeout.
