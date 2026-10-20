# Quotas & Credits

Authenta bills media analysis in **credits**. Credits are shared between the web console and the API, and every job's cost is set when it is created, before it runs.

# What costs credits

Only creating a job costs credits. Reading, listing, cancelling and deleting jobs, and uploading files to storage, are free.

| Request | Credits |
|---|---|
| `POST /jobs` | The job's `cost`, charged when the job is created |
| `POST /jobs/{id}/finalize` | Free |
| `GET /jobs`, `GET /jobs/{id}` | Free |
| `POST /jobs/{id}/cancel`, `DELETE /jobs/{id}` | Free, and refund the job if it hadn't started processing |
| `PUT` to an `uploadUrl` | Free |

## How a job's cost is set

A job's cost depends on the task type, not on the file size:

- **Most task types** have a fixed price per job, set by your plan.
- **`pdf-tampering-detection`** is priced per page: the per-page price × the `pageCount` you send.
- **`face-intelligence`** is the sum of the checks you enable: faceswap 60, liveness 30, similarity 30.

The `cost` field on the job (returned by `POST /jobs`) is the exact amount charged.

# When credits are charged and refunded

Credits are charged **once, when the job is created** (`POST /jobs`). If your balance is too low, the job isn't created and nothing is charged.

The full cost is refunded automatically when:

| Event | Refunded |
|---|---|
| You cancel the job (`initiated` or `queued`) | Yes |
| You delete the job before it starts processing | Yes |
| The job is never finalized and its files never arrive (cleaned up after about 20 minutes) | Yes |
| The job fails after its automatic retries | Yes |
| The job completes | No |
| You delete a completed or failed job | No (a failed job was already refunded) |

Your credit history in **Settings → Billing** shows each charge and refund.

# Pay-as-you-go

If pay-as-you-go is enabled on your account, jobs keep running when your credit balance runs out, and the usage is billed monthly up to your monthly limit. When the limit is reached, `POST /jobs` returns `402` `PAYG_LIMIT_REACHED`.

# Request limits

There's currently no per-key quota on the number of API requests. Keep polling to every 3–5 seconds per job; limits may be introduced later, and when they are they'll be documented here with the error they return.

# Credit errors

Both errors come from `POST /jobs`, use the [standard error shape](/api/reference/jobs#errors), and mean nothing was charged.

| Status | `name` | Meaning | What to do |
|---|---|---|---|
| `402` | `INSUFFICIENT_BALANCE` | Not enough credits, and pay-as-you-go is off | Top up in **Settings → Billing**, then retry |
| `402` | `PAYG_LIMIT_REACHED` | The monthly pay-as-you-go limit is reached | Raise the limit or wait for the next billing month |

Don't retry these errors in a loop: they won't succeed until the balance or limit changes. Alert your team instead.

# Monitoring usage

**Settings → Billing** shows your current balance, pay-as-you-go usage, and the history of charges and refunds. If you run batch pipelines, check the balance before a large batch so it doesn't stop halfway.

# Next steps

- [Making API Calls](/api/making-api-calls)
- [Jobs API Reference](/api/reference/jobs)
