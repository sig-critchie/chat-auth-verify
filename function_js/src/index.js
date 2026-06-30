// >> START chat-auth-verify-javascript Example of simple NodeJS function (javascript) for Genesys Cloud Function to verify signed chat auth payload (HMAC-SHA256)

// Import needed built in and external libraries.
const { verifyChatAuth } = require('./hmac_utils');

// >> START chat-auth-verify-javascript-step-1
exports.handler = async (event, context, callback) => {
    // Retrieve Data Action inputs from Event
    // sharedSecret is injected via the requestTemplate from Integration Custom Credentials -
    // it never travels from the browser/Architect, only customerRef/generationTime/signature do.
    let sharedSecret = event.sharedSecret;
    let customerRef = event.customerRef;
    let generationTime = event.generationTime;
    let signature = event.signature;
    // >> END chat-auth-verify-javascript-step-1

    try {
        // >> START chat-auth-verify-javascript-step-2
        let result = verifyChatAuth(customerRef, generationTime, signature, sharedSecret);

        return {
            valid: result.valid,
            reason: result.reason || '',
            customerRef: result.valid ? customerRef : ''
        };
        // >> END chat-auth-verify-javascript-step-2
    } catch (error) {
        // >> START chat-auth-verify-javascript-step-3
        // Example of using the callback to return an error
        // This is for irremediable uncaught errors - validation failures are returned above as valid:false instead
        console.error("Handler failed: " + error);
        callback(error);
        // >> END chat-auth-verify-javascript-step-3
    }
};
// >> END chat-auth-verify-javascript
