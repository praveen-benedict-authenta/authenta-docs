# Making API Calls

This page explains how to correctly interact with the Authenta API after you have created an **API key**.

You'll learn how to structure requests, authenticate, upload media using the **job-based upload flow**, and handle all API responses.

# Base URL

Authenta exposes its API under:

```txt
https://platform.authenta.ai/api/v1
```

All routes extend this base URL:

- `POST /jobs`
- `GET /jobs`
- `GET /jobs/{id}`
- `POST /jobs/{id}/finalize`
- `POST /jobs/{id}/cancel`
- `DELETE /jobs/{id}`

Your deployment (dev, staging, on-prem) may use a different domain.

# Required Authentication Headers

Every request must include your API key in the Authorization header:

```http
Authorization: Bearer <your_api_key>
```

Example:

```http
Authorization: Bearer api_xxxxxxxx...
```

If this header is missing or invalid, the API returns:

`INVALID_API_KEY – API key authentication failed`

# Example: GET Request

### cURL

```bash
curl -X GET "https://platform.authenta.ai/api/v1/jobs" \
  -H "Authorization: Bearer api_xxxxxxxx..."
```

### JavaScript (fetch)

```js
const res = await fetch('https://platform.authenta.ai/api/v1/jobs', {
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
    "https://platform.authenta.ai/api/v1/jobs",
    headers={
        "Authorization": f"Bearer {os.getenv('API_KEY')}"
    }
)
print(response.json())
```

# Uploading Media (Job-Based Upload Flow)

Authenta **does not** accept raw file uploads directly through the API.

Instead, uploading media consists of **three steps**:

1. **Create a job** (via `POST /jobs`), specifying the task type and file metadata
2. **Upload the actual file to a pre-signed S3 URL** returned in the job response
3. **Finalize the job** (via `POST /jobs/{jobId}/finalize`) to queue it for processing

Processing begins only after the job is finalized.

## Step 1 — Create a Job

Call:

```
POST /jobs
```

This creates a job in Authenta's database and returns:

- `job.id`
- `job.status`
- `inputs` — one entry per uploaded file, including its `uploadUrl` (pre-signed S3 URL)

### Example Request

```bash
curl -X POST "https://platform.authenta.ai/api/v1/jobs" \
  -H "Authorization: Bearer api_xxxxxxxx..." \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      {
        "contentType": "image/jpeg",
        "fileName": "image.jpg",
        "sizeBytes": 414241,
        "slotName": "original"
      }
    ],
    "taskTypeId": "1"
  }'
```

### Example Response

```json
{
  "job": {
    "id": "3140",
    "status": "initiated"
  },
  "inputs": [
    {
      "slotName": "original",
      "uploadUrl": "https://authenta-storage.s3.us-east-1.amazonaws.com/jobs/3140/original?...",
      "contentType": "image/jpeg",
      "fileName": "image.jpg",
      "sizeBytes": 414241
    }
  ]
}
```

> ✔ No credits are consumed yet; processing hasn't started.

### Important

The metadata (`fileName`, `sizeBytes`, `contentType`, `slotName`) must exactly match the file you upload in Step 2. Any mismatch may result in upload validation failure.

## Step 2 — Upload the File to S3

Use the `uploadUrl` returned above to upload the actual media file.

### Example (cURL)

```bash
curl -X PUT "https://signed-s3-upload-url" \
  -H "Content-Type: image/jpeg" \
  --data-binary "@./path/to/image.jpg"
```

### Important Notes

- The upload must match the `contentType` and `sizeBytes` specified in Step 1.
- Upload URLs are temporary and intended for a single upload.
- Uploading to S3 **does not** count as an API call and does **not** consume credits.
- A successful upload returns HTTP `200 OK`.

## Step 3 — Finalize the Job

After all files have been uploaded successfully, call the finalize endpoint to queue the job for processing:

```bash
curl -X POST "https://platform.authenta.ai/api/v1/jobs/3140/finalize" \
  -H "Authorization: Bearer api_xxxxxxxx..."
```

### Example Response

```json
{
  "job": {
    "id": "3140",
    "status": "queued"
  }
}
```

### Why Finalization Is Required

Without finalization:

- Processing will not start
- Results will not be generated
- The job remains in `waiting_for_finalize` state

## When Does Processing Start?

After the job is finalized:

1. The job is queued for processing
2. Authenta's workers pick up the job
3. Media processing begins
4. The job status updates automatically as it progresses

You can poll the status via:

```
GET /jobs/{jobId}
```

Typical status values include:

- `waiting_for_finalize`
- `queued`
- `processing`
- `completed`
- `failed`
- `cancelled`

# Fetching a Single Job

### Example

```bash
curl -X GET "https://platform.authenta.ai/api/v1/jobs/3140" \
  -H "Authorization: Bearer api_xxxxxxxx..."
```

> ✔ This request does not consume credits.

# Deleting a Job

```bash
curl -X DELETE "https://platform.authenta.ai/api/v1/jobs/3140" \
  -H "Authorization: Bearer api_xxxxxxxx..."
```

Notes:

- It does **not** consume credits.
- Jobs can only be deleted if they are not currently processing.
- If your key lacks delete permission:

```
FORBIDDEN – You don't have permission to access this
```

# Response Structure

Authenta always returns JSON.

### Example Success Response

```json
{
  "job": {
    "id": "3140",
    "status": "completed"
  },
  "result": {
    "isFake": true,
    "confidencePercent": 98.0,
    "fakeConfidencePercent": 98.0,
    "realConfidencePercent": 2.0
  }
}
```

For image detection, the poll response exposes a flat `result` object with percentage fields. `confidence` and `isAiGenerated` are not returned by the Jobs API. To derive a normalized fake-confidence value, calculate `fakeConfidencePercent / 100`.

### Example List Response

```json
{
  "data": [
    {
      "job": {
        "id": "3140",
        "status": "completed"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
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
- `job.id` (if applicable)

# Best Practices for API Integrations

### ✔ Always validate your file before upload

Match the `fileName`, `contentType`, and `sizeBytes` fields exactly.

### ✔ Poll job status after finalizing

Use `GET /jobs/{jobId}` to determine completion.

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

- Use `POST /jobs` to create a job and receive an `uploadUrl`
- Upload the file to the **pre-signed S3 URL**
- Call `POST /jobs/{jobId}/finalize` to queue the job for processing
- Poll `GET /jobs/{jobId}` for status and results
- Credits are consumed **only** when processing starts (after finalize)
- No limits on API calls — make unlimited requests
- All errors use structured error responses

# Next Steps

- [Learn about quotas](/api/quotas-and-credits)
- [Review authentication](/api/authentication)
- [Explore API endpoints](/api/reference/jobs)
