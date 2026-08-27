const crypto = require('crypto');

console.log('=== Secure JWT Secrets ===\n');

console.log('ACCESS_TOKEN_SECRET=');
console.log(crypto.randomBytes(64).toString('hex'));

console.log('\nREFRESH_TOKEN_SECRET=');
console.log(crypto.randomBytes(64).toString('hex'));

console.log('\n=== Copy these to your .env file ===');
