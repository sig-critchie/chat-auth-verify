## Data Action Contract and Configuration

### Required Custom Credentials (Integration's configuration level)

The function expects one custom credential at the Genesys Function Data Actions
integration level:

* **SHARED_SECRET**: base64-encoded HMAC key, shared with the PHP backend.
  This value never travels through Architect or the browser - only the
  resulting signature does. Store it only as an Integration credential.

### Contract

In the Action's Setup tab, select *Contracts*.
Click on the *JSON* switch (from *Simple* to *JSON* display).

#### Input Contract

```json
{
  "title": "ChatAuthVerifyRequest",
  "type": "object",
  "required": [
    "customerRef",
    "generationTime",
    "signature"
  ],
  "properties": {
    "customerRef": {
      "type": "string",
      "description": "Customer reference number as set via Database.set customAttributes"
    },
    "generationTime": {
      "type": "string",
      "description": "UTC ISO 8601 timestamp (e.g. 2026-07-01T03:12:45Z) from the PHP backend"
    },
    "signature": {
      "type": "string",
      "description": "Hex-encoded HMAC-SHA256 of customerRef|generationTime"
    }
  },
  "additionalProperties": false
}
```

#### Output Contract

```json
{
  "title": "ChatAuthVerifyResponse",
  "type": "object",
  "properties": {
    "valid": {
      "description": "True only if the signature matches and generationTime is within the allowed window",
      "type": "boolean"
    },
    "reason": {
      "description": "Empty if valid; otherwise one of: missing_fields, bad_timestamp, expired_or_future, signature_mismatch, server_error",
      "type": "string"
    },
    "customerRef": {
      "description": "Echoed back only when valid is true - branch on this being non-empty in Architect, never trust the original input value",
      "type": "string"
    }
  },
  "additionalProperties": true
}
```

### Configuration

In the Action's Setup tab, select *Configuration*.
Click on the *JSON* switch (from *Simple* to *JSON* display).

#### Request Configuration

The shared secret is injected here from the Integration's Custom Credentials -
it is never passed as a flow variable and never originates from the browser.

```json
{
  "requestType": "POST",
  "headers": {},
  "requestTemplate": "{ \"sharedSecret\": \"$!{credentials.SHARED_SECRET}\", \"customerRef\": \"$!{input.customerRef}\", \"generationTime\": \"$!{input.generationTime}\", \"signature\": \"$!{input.signature}\" }"
}
```

#### Response Configuration

```json
{
  "translationMap": {},
  "translationMapDefaults": {},
  "successTemplate": "${rawResult}"
}
```

### Function

In the Action's Setup tab, select *Function*.

**Handler:** "src/index.handler"
**Runtime:** built with "nodejs20.x" (no external npm dependencies - uses Node's built-in `crypto` module)

### Using it in an Architect flow

1. **Get Participant Data** block - read `customerRef`, `generationTime`, `signature`
   (set via `Database.set` customAttributes on the client) into flow variables.
2. **Call Data Action** block - call this action, mapping the three flow
   variables to the input contract, and the response fields (`valid`, `reason`,
   `customerRef`) to new flow variables.
3. **Decision** block - branch on `valid == true`. If false, you can route to
   a rejection path (e.g. disconnect, or flag the conversation/log `reason`
   for monitoring) instead of treating the original, unverified `customerRef`
   as authentic.

Important: once verified, use the **`customerRef` returned by the Data Action**
(not the one read from participant data) for anything downstream that assumes
the value is trustworthy - the response field is only populated when `valid`
is true, so any code path that reaches it has already passed verification.

### Local testing

```bash
cd function_js
npm install            # no-op, no dependencies, but keeps the workflow consistent
node ../test/generate-fixture.js          # regenerates test/data.json with a fresh, currently-valid signature (signatures expire after 60s)
npm run localtest1                        # valid case
node ../test/test_function_js.mjs ../test/data-expired.json ../test/context.json   # expired timestamp -> valid:false
node ../test/test_function_js.mjs ../test/data-badsig.json ../test/context.json    # tampered signature -> valid:false
```
