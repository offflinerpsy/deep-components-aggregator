#!/usr/bin/env node
/**
 * Test DigiKey OAuth on REMOTE server via curl
 * Run this to test if DigiKey works from Amsterdam IP
 */

console.log('🧪 Testing DigiKey OAuth from server...');
console.log('');
console.log('CLIENT_ID: mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm');
console.log('CLIENT_SECRET: splmTf8gdnBAAT8p3bfybhBIw8vXozuqYWmasqNBOTEsJ5nlBjGuSHdts8u7dnV1');
console.log('');
console.log('Copy and paste this command to Amsterdam server:');
console.log('');
console.log('----------------------------------------');
console.log(`curl -sS -X POST 'https://api.digikey.com/v1/oauth2/token' \\
  -H 'Content-Type: application/x-www-form-urlencoded' \\
  --data-urlencode 'client_id=mt0wx2AcFbqaGgEcKJkXAgEWmQ769JcOTggr0TxynL2pP8cm' \\
  --data-urlencode 'client_secret=splmTf8gdnBAAT8p3bfybhBIw8vXozuqYWmasqNBOTEsJ5nlBjGuSHdts8u7dnV1' \\
  --data-urlencode 'grant_type=client_credentials'`);
console.log('----------------------------------------');
console.log('');
console.log('If you get {"access_token":"...","expires_in":599} = SUCCESS!');
console.log('If you get 403 Blocked = DigiKey blocks Amsterdam too :(');
