# Making API Calls

This page walks through a complete integration: authenticate, run a job, read the result and handle errors. Exact request and response shapes for every endpoint are in the [Jobs API Reference](/api/reference/jobs), which is the source of truth for the contract.

# Base URL

```txt
https://platform.authenta.ai/api/v1
```

# Authentication

Send your API key as a bearer token on every request:

```http
Authorization: Bearer api_xxxxxxxx...
```

See [Authentication](/api/authentication) for the errors a missing or invalid key returns.

```bash
curl "https://platform.authenta.ai/api/v1/jobs" \
  -H "Authorization: Bearer $AUTHENTA_API_KEY"
```

# Running a job

The API doesn't take file bytes directly. A job runs in four steps:

1. **Create the job** with `POST /jobs`, sending the task type and each file's name, MIME type and exact size. The response has the job and an `uploadUrl` per input. Credits are charged at this point.
2. **Upload each file** with a `PUT` to its `uploadUrl`. This goes straight to storage, so don't send your `Authorization` header. Upload URLs expire quickly (30 seconds for small files).
3. **Finalize** with `POST /jobs/{id}/finalize`. The job moves to `queued`.
4. **Poll** `GET /jobs/{id}` until `status` is `completed`, `failed` or `cancelled`, then read `result`.

```python
import os, time, requests

API = "https://platform.authenta.ai/api/v1"
HEADERS = {"Authorization": f"Bearer {os.environ['AUTHENTA_API_KEY']}"}

def analyze(path: str, task_type_id: str, content_type: str) -> dict:
    # 1. Create the job
    body = {
        "taskTypeId": task_type_id,
        "inputs": [{
            "slotName": "original",
            "fileName": os.path.basename(path),
            "contentType": content_type,
            "sizeBytes": os.path.getsize(path),
        }],
    }
    res = requests.post(f"{API}/jobs", json=body, headers=HEADERS)
    res.raise_for_status()
    created = res.json()
    job_id = created["job"]["id"]

    # 2. Upload the file to storage (no Authorization header)
    with open(path, "rb") as f:
        upload = requests.put(created["inputs"][0]["uploadUrl"], data=f, headers={"Content-Type": content_type})
    upload.raise_for_status()

    # 3. Finalize
    requests.post(f"{API}/jobs/{job_id}/finalize", headers=HEADERS).raise_for_status()

    # 4. Poll for the result
    while True:
        job = requests.get(f"{API}/jobs/{job_id}", headers=HEADERS).json()
        if job["status"] in ("completed", "failed", "cancelled"):
            return job
        time.sleep(3)

job = analyze("test.jpg", "1", "image/jpeg")
print(job["status"], job["result"])
```

The task types, their IDs and accepted file types are listed in the [Task Types catalog](/api/task-types#catalog). The full status list is in [Job lifecycle](/api/reference/jobs#job-lifecycle).

# Errors

Every error has the same JSON shape. Branch on `name`, not on `message`:

```json
{
  "rid": "9b6f1d2e-5c1a-4b7e-8f3d-2a1c0e9d8b7a",
  "name": "INSUFFICIENT_BALANCE",
  "message": "Insufficient balance. Please top up or enable pay-as-you-go billing"
}
```

Log `rid` with every error; support uses it to find your request. The full list of codes is in the [Jobs API Reference](/api/reference/jobs#errors).

## Retrying

| Error | Retry? |
|---|---|
| Network errors, timeouts, `5xx` | Yes, with exponential backoff (for example 1 s, 2 s, 4 s, … up to about 30 s) |
| `402` `INSUFFICIENT_BALANCE` / `PAYG_LIMIT_REACHED` | Not automatically. Top up or raise the limit in **Settings → Billing**, then retry |
| `401` `UNAUTHENTICATED` / `INVALID_API_KEY`, `403` `FORBIDDEN` | No. Fix the key or its permissions |
| `404`, `409`, `422` | No. Fix the request; see the error's `fields` for validation details |

Retrying `POST /jobs` after a network error can create a second job, and charge for it, if the first request actually reached the server. Before retrying, check `GET /jobs` for a job created in the last few seconds, and [cancel](/api/reference/jobs#cancel-a-job) any duplicate to get its credits back.

# Best practices

- **Upload right after creating the job.** Upload URLs expire quickly. If one expires, cancel the job (credits are refunded) and create a new one.
- **Send exact file metadata.** `contentType` and `sizeBytes` must match the uploaded bytes exactly, or storage rejects the upload.
- **Poll gently.** Poll every 3–5 seconds, and use a timeout so a stuck job doesn't block your pipeline.
- **Keep keys server-side.** Never ship an API key in a mobile app, browser code or a public repository. See [Managing API Keys](/api/managing-api-keys#keeping-keys-safe).
- **Use one key per system** with only the permissions it needs, so you can revoke one without touching the others.

# Next steps

- [Jobs API Reference](/api/reference/jobs)
- [Quotas & Credits](/api/quotas-and-credits)
- [API Explorer](/api/explorer): try the requests from your browser
