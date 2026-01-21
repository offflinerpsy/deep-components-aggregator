# Incident: UI unstyled / broken layout (CSS asset mismatch)

## Symptoms
- Pages (notably `/catalog`) rendered like “raw HTML” (Tailwind styles missing).
- Network showed a CSS URL under `/_next/static/css/*.css` returning an HTML error instead of CSS.

## Root cause
- The running Next.js process was serving HTML that referenced a stale CSS asset filename that did not exist in the current `.next/static/css` output.
- Requests to that missing asset returned an error page (HTML), so the browser had no Tailwind/theme CSS.

Additional observed variant:
- `/catalog` referenced a stale `/_next/static/chunks/app/layout-*.js` filename that did not exist in the current `.next/static/chunks/app` output.
- The missing chunk was served as `400 Bad Request` HTML, which triggers Next’s “Application error: a client-side exception has occurred”.

## Fix applied
- Restarted the Next.js process so it reloads the current `.next` build output/manifest.
- After restart, `/catalog` references only CSS files that exist on disk and are served as `text/css`.
- Restarted PM2 process `deep-v0` after rebuilding so HTML chunk references match the on-disk `.next` output.

## Proof
- See `css-asset-proof.txt` in this folder.
- See `layout-chunk-400.txt` and `layout-chunk-after-restart.txt` in this folder.

## Prevention (ops)
- After `next build`, always restart/reload the Next.js process (`pm2 reload`/restart) so the running server and `.next` output stay in sync.
- Avoid building into the same working directory while a long-running `next start` is serving from it (deploy to a fresh directory or do an atomic swap).
