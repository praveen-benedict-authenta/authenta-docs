# Making API Calls

This page explains how to correctly interact with the Authenta API after:

1. Your API access request has been **approved**, and
2. You have created an **API key** (Client ID + Client Secret).

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

Every request must include your API key credentials:

```http
x-client-id: <your_client_id>
x-client-secret: <your_client_secret>
```

If these are missing or invalid, the API returns:

`IAM001 – You are not authenticated`

# Example: GET Request

### cURL

```bash
curl -X GET "https://platform.authenta.ai/api/media" \
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-client-secret: YOUR_CLIENT_SECRET"
```

### JavaScript (fetch)

```js
const res = await fetch('https://platform.authenta.ai/api/media', {
  headers: {
    'x-client-id': process.env.CLIENT_ID,
    'x-client-secret': process.env.CLIENT_SECRET,
  },
});
platform.log(await res.json());
```

### Python

```python
import requests

response = requests.get(
    "https://platform.authenta.ai/api/media",
    headers={
        "x-client-id": "YOUR_CLIENT_ID",
        "x-client-secret": "YOUR_CLIENT_SECRET"
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
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-client-secret: YOUR_CLIENT_SECRET" \
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

> ✔ This is a **Mutation** request — it reduces your Mutation Quota.
> ✔ No credits are consumed yet.

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
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-client-secret: YOUR_CLIENT_SECRET"
```

> ✔ This is a **Query** request — it reduces your Query Quota.
> ✔ This request does not consume credits.

# Deleting Media

```bash
curl -X DELETE "https://platform.authenta.ai/api/media/692f406f9f68d4b70080bb80" \
  -H "x-client-id: YOUR_CLIENT_ID" \
  -H "x-client-secret: YOUR_CLIENT_SECRET"
```

Notes:

- This is a **Mutation** request — it reduces your Mutation Quota.
- It does **not** consume credits.
- If your key lacks delete permission:

```
IAM002 – You are not authorized
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

Authenta returns structured error objects based on your TypeScript `ErrorCode` class.

### ❌ IAM001 — Invalid Client Credentials

```json
{
  "code": "IAM001",
  "type": "UNAUTHENTICATED",
  "message": "You are not authenticated"
}
```

### ❌ IAM002 — Insufficient Permissions

```json
{
  "code": "IAM002",
  "type": "UNAUTHORIZED",
  "message": "You are not authorized"
}
```

### ❌ AA001 — API Limit Reached (Quota Exceeded)

```json
{
  "code": "AA001",
  "type": "CLIENT_ERROR",
  "message": "API limit reached"
}
```

### ❌ U007 — Insufficient Credits

Returned when attempting to process media without enough credits:

```json
{
  "code": "U007",
  "type": "CLIENT_ERROR",
  "message": "Insufficient credits"
}
```

# Handling Errors Gracefully

### ⛔ Do NOT retry on:

- `AA001` (quota exhausted)
- `U007` (insufficient credits)
- `IAM002` (unauthorized)

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

# Summary

- Use `POST /media` to create a record
- Upload the file to the **pre-signed S3 URL**
- Poll `GET /media/{id}` for status
- Media processing starts automatically after upload
- Quotas limit Query & Mutation calls
- Credits are consumed **only** when processing starts
- All errors use structured error responses

# Next Steps

- [Learn about quotas](/api/quotas-and-credits)
- [Review authentication](/api/authentication)
- [Explore API endpoints](/api/reference/media)
