'use strict';

// Import needed built in libraries.
const crypto = require('node:crypto');

// Must match the PHP side exactly: signed message is "customerRef|generationTime"
const MAX_AGE_SECONDS = 60;
const CLOCK_SKEW_ALLOWANCE_SECONDS = 5; // tolerate generationTime slightly in the future

function computeSignatureHex(customerRef, generationTime, sharedSecretBase64) {
    if (!sharedSecretBase64) {
        throw new Error('Unset SHARED SECRET');
    }
    if (!customerRef) {
        throw new Error('Missing customerRef');
    }
    if (!generationTime) {
        throw new Error('Missing generationTime');
    }

    const secret = Buffer.from(sharedSecretBase64, 'base64');
    const message = `${customerRef}|${generationTime}`;

    return crypto.createHmac('sha256', secret).update(message).digest('hex');
}

function verifyChatAuth(customerRef, generationTime, signature, sharedSecretBase64) {
    // Basic presence checks
    if (!customerRef || !generationTime || !signature) {
        return { valid: false, reason: 'missing_fields' };
    }

    // 1. Time window check - generationTime must be a recent, valid UTC timestamp
    const generatedAtMs = Date.parse(generationTime);
    if (Number.isNaN(generatedAtMs)) {
        return { valid: false, reason: 'bad_timestamp' };
    }

    const ageSeconds = (Date.now() - generatedAtMs) / 1000;
    if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -CLOCK_SKEW_ALLOWANCE_SECONDS) {
        return { valid: false, reason: 'expired_or_future' };
    }

    // 2. Signature check - constant time comparison, no early-exit string compare
    let expectedHex;
    try {
        expectedHex = computeSignatureHex(customerRef, generationTime, sharedSecretBase64);
    } catch (error) {
        return { valid: false, reason: 'server_error', detail: error.message };
    }

    const expectedBuf = Buffer.from(expectedHex, 'hex');
    const givenBuf = Buffer.from(String(signature), 'hex');

    if (
        expectedBuf.length === 0 ||
        givenBuf.length === 0 ||
        expectedBuf.length !== givenBuf.length ||
        !crypto.timingSafeEqual(expectedBuf, givenBuf)
    ) {
        return { valid: false, reason: 'signature_mismatch' };
    }

    return { valid: true, reason: '' };
}

module.exports.computeSignatureHex = computeSignatureHex;
module.exports.verifyChatAuth = verifyChatAuth;
