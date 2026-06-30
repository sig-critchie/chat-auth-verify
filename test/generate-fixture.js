// Regenerates test/data.json with a fresh, currently-valid signature.
// Usage: node generate-fixture.js [customerRef]
// Mirrors exactly what the PHP backend does - see hmac_utils.js computeSignatureHex.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const SHARED_SECRET = 'Vy9So1EHo5sJo9w+vDA6hzuJs72WSxWUoiH58+Kl9Ss='; // test secret only
const customerRef = process.argv[2] || '215636';

function isoNoMillis(date) {
    return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

const generationTime = isoNoMillis(new Date());
const message = `${customerRef}|${generationTime}`;
const signature = crypto
    .createHmac('sha256', Buffer.from(SHARED_SECRET, 'base64'))
    .update(message)
    .digest('hex');

const fixture = { sharedSecret: SHARED_SECRET, customerRef, generationTime, signature };

fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(fixture, null, 2) + '\n');
console.log('Wrote test/data.json:');
console.log(JSON.stringify(fixture, null, 2));
