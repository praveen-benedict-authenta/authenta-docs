# Making API Calls

This page explains how to correctly interact with the Authenta API after you have created an **API key**.

You’ll learn how to structure requests, authenticate, upload media using the **two-step upload flow**, and handle all API responses.

# Base URL

Authenta exposes its API under:

```txt
https://platform.authenta.ai/api
```

All routes extend this base URL:

- `POST /media`
- `GET /media`
- `GET /media/{mid}`
- `DELETE /media/{mid}`

Your deployment (dev, staging, on-prem) may use a different domain.

# Required Authentication Headers

Every request must include your API key in the Authorization header:

```http
Authorization: Bearer <your_api_key>
```

Example:

```http
Authorization: Bearer api_apk_xxxxxxxx...
```

If this header is missing or invalid, the API returns:

`INVALID_API_KEY – API key authentication failed`

# Example: GET Request

### cURL

```bash
curl -X GET "https://platform.authenta.ai/api/media" \
  -H "Authorization: Bearer api_apk_xxxxxxxx..."
```

### JavaScript (fetch)

```js
const res = await fetch('https://platform.authenta.ai/api/media', {
  headers: {
    'Authorization': `Bearer ${process.env.API_KEY}`,
  },
});
console.log(await res.json());
```

### Python

```python
import requests

response = requests.get(
    "https://platform.authenta.ai/api/media",
    headers={
        "Authorization": f"Bearer {os.getenv('API_KEY')}"
    }
)
print(response.json())
```

# Uploading Media (Two-Step Process)

Authenta **does not** accept raw file uploads directly through the API.

Instead, uploading media consists of **two steps**:

1. **Create a media record** (via `POST /media`)
2. **Upload the actual file to a pre-signed S3 URL**

Processing begins automatically once the file is uploaded.

## Step 1 — Create Media Record

Call:

```
POST /media
```

This creates a media record in Authenta’s database and returns:

- `mid`
- `uploadUrl` (pre-signed S3 URL)
- `expiresIn` (seconds)
- Any additional data needed for upload

### Example Request

```bash
curl -X POST "https://platform.authenta.ai/api/media" \
  -H "Authorization: Bearer api_apk_xxxxxxxx..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "video_sample",
    "contentType": "video/mp4",
    "size": 1024000,
    "modelType": "DF-1"
  }'
```

### Example Response

```json
{
  "mid": "692f406f9f68d4b70080bb80",
  "name": "video_sample",
  "type": "Video",
  "status": "INITED",
  "modelType": "AC-1",
  "createdAt": "2025-12-02T19:39:27.525Z",
  "uploadUrl": "https://authenta-storage.s3.us-east-1.amazonaws.com/users/692d5c1d0ac955973b9583fc/media/692f406f9f68d4b70080bb80/original.media?..."
}
```

> ✔ No credits are consumed yet; processing hasn't started.

## Step 2 — Upload the File to S3

Use the `uploadUrl` returned above to upload the actual media file.

### Example (cURL)

```bash
curl -X PUT "https://signed-s3-upload-url" \
  -H "Content-Type: video/mp4" \
  --data-binary "@./path/to/video.mp4"
```

### Important Notes

- The upload must match the `contentType` and `size` specified in Step 1.
- Uploading to S3 **does not** count as an API call.
- Uploading to S3 does **not** consume Mutation or Query quotas.
- Uploading to S3 does **not** consume credits.

## When Does Processing Start?

After the file is uploaded to the pre-signed S3 URL:

1. S3 fires an internal event
2. Authenta detects the upload
3. Media processing begins
4. The media record updates automatically

You can poll the status via:

```
GET /media/{mid}
```

Possible statuses include:

- `INITED`
- `UPLOADED`
- `PROCESSED`

# Fetching a Single Media Item

### Example

```bash
curl -X GET "https://platform.authenta.ai/api/media/692f406f9f68d4b70080bb80" \
  -H "Authorization: Bearer api_apk_xxxxxxxx..."
```

> ✔ This request does not consume credits.

# Deleting Media

```bash
curl -X DELETE "https://platform.authenta.ai/api/media/692f406f9f68d4b70080bb80" \
  -H "Authorization: Bearer api_apk_xxxxxxxx..."
```

Notes:

- It does **not** consume credits.
- If your key lacks delete permission:

```
FORBIDDEN – You don't have permission to access this
```

# Response Structure

Authenta always returns JSON.

### Example Success Response

```json
{
  "mid": "692f406f9f68d4b70080bb80",
  "name": "video_sample",
  "type": "Video",
  "status": "INITED",
  "modelType": "DF-1",
  "createdAt": "2025-12-02T19:39:27.525Z",
  "uploadUrl": "https://authenta-storage.s3.us-east-1.amazonaws.com/users/692d5c1d0ac955973b9583fc/media/692f406f9f68d4b70080bb80/original.media?..."
}
```

### Example List Response

```json
{
  "limit": 3,
  "offset": 0,
  "total": 1,
  "data": [
    {
      "mid": "692f406f9f68d4b70080bb80",
      "name": "video_sample",
      "type": "Video",
      "status": "INITED",
      "modelType": "DF-1",
      "createdAt": "2025-12-02T19:39:27.525Z"
    }
  ]
}
```

# Error Responses

Authenta returns structured error objects with a code, statusCode, and message.

### ❌ INVALID_API_KEY — Invalid or Missing API Key

```json
{
  "code": "INVALID_API_KEY",
  "statusCode": 401,
  "message": "API key authentication failed"
}
```

### ❌ FORBIDDEN — Insufficient Permissions

```json
{
  "code": "FORBIDDEN",
  "statusCode": 403,
  "message": "You don't have permission to access this"
}
```

### ❌ INSUFFICIENT_BALANCE — Insufficient Credits

```json
{
  "code": "INSUFFICIENT_BALANCE",
  "statusCode": 402,
  "message": "Insufficient balance. Please top up or enable pay-as-you-go billing"
}
```

# Handling Errors Gracefully

### ⛔ Do NOT retry on:

- `INSUFFICIENT_BALANCE` (insufficient credits)
- `FORBIDDEN` (insufficient permissions)
- `INVALID_API_KEY` (authentication failed)

### 🔁 You MAY retry on:

- Network timeouts
- 500-level server errors

### 🔒 Always log:

- `code`
- `message`
- `mid` (if applicable)

# Best Practices for API Integrations

### ✔ Always validate your file before upload

Match the `contentType` and `size` fields.

### ✔ Poll media status after uploading

Use `GET /media/{mid}` to determine completion.

### ✔ Separate keys for separate environments

Use one key for:

- production
- staging
- CI/testing

### ✔ Do not hardcode secrets

Use environment variables or a secret manager.

### ✔ Monitor your credit balance

Check your remaining credits regularly via Settings → Billing to avoid interruptions.

# Summary

- Use `POST /media` to create a record
- Upload the file to the **pre-signed S3 URL**
- Poll `GET /media/{id}` for status
- Media processing starts automatically after upload
- Credits are consumed **only** when processing starts
- No limits on API calls — make unlimited requests
- All errors use structured error responses

# Next Steps

- [Learn about quotas](/api/quotas-and-credits)
- [Review authentication](/api/authentication)
- [Explore API endpoints](/api/reference/media)
