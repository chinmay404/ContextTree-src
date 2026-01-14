const https = require('https');

// The "Nuclear" option
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

console.log('Testing connection to contexttreeapi.duckdns.org with SSL bypass...');

fetch('https://contexttreeapi.duckdns.org', {
  method: 'GET',
} as any)
.then(res => {
  console.log('Status:', res.status);
  console.log('Success! Connected despite expired cert.');
})
.catch(err => {
  console.error('Failed:', err.message);
  if (err.cause) console.error('Cause:', err.cause);
});
