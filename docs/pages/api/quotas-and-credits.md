## Concepts Overview

### Quotas

Quotas control the number of API calls you can make:

- **Query Quota** → for `GET` requests
- **Mutation Quota** → for `POST`, `PUT`, `DELETE` requests

Quotas are:

- Configured when you **request API access**
- Approved by the Authenta team
- Tracked and enforced per user
- Optionally allocated per API key (within your total user quota)

### Credits

Credits represent your ability to **process media** (for example, analyzing videos).

Key points:

- Processing media **via API** consumes credits
- Processing media **via UI** also consumes credits
- Credits are shared between UI and API usage
- Non-processing operations (like fetching metadata) do **not** consume credits

## Query vs Mutation Quotas

When requesting API access, you must specify:

1. **Mutation Quota**

   - Count of **write** operations
   - Covers `POST`, `PUT`, `DELETE`
   - Typical usage:
     - Uploading media
     - Deleting media

2. **Query Quota**
   - Count of **read-only** operations
   - Covers `GET`
   - Typical usage:
     - Fetching a list of media
     - Fetching a particular media item

## Quota Relationship (1.5× Rule)

Authenta enforces a simple rule to ensure sufficient capacity for reads:

> **Query Quota must be at least 1.5 × Mutation Quota.**

Examples:

| Mutation Quota | Minimum Query Quota |
| -------------- | ------------------- |
| 20             | 30                  |
| 40             | 60                  |
| 100            | 150                 |

If your values do not satisfy this rule, the API access request (or quota increase request) will not be accepted until adjusted.

## Per-User and Per-Key Quotas

Quotas are configured at the **user level**, but can be allocated to **individual API keys**.

For example:

- User-level quota: **60 Query / 40 Mutation**
- You may allocate this across keys like:

| Key            | Query Quota | Mutation Quota |
| -------------- | ----------- | -------------- |
| Backend Key    | 40          | 25             |
| Automation Key | 20          | 15             |

Once an API key reaches its quota:

- That key can no longer make the corresponding requests
- Other keys may still work, as long as they have remaining quota

The user-level quota serves as the upper bound; per-key quotas are slices inside that bound.

# Error Codes Related to Quotas & Credits

Authenta uses structured error objects with a code, type, message, and status.

Here are the relevant errors for quota and credit issues.

## ❌ AA001 — API Limit Reached (Quota Exceeded)

Returned when your **Query** or **Mutation** quota is exhausted.

| Field       | Value               |
| ----------- | ------------------- |
| **code**    | `AA001`             |
| **type**    | `CLIENT_ERROR`      |
| **message** | `API limit reached` |
| **status**  | `429`               |

### Example Response

```json
{
  "code": "AA001",
  "type": "CLIENT_ERROR",
  "message": "API limit reached"
}
```

## ❌ U007 — Insufficient Credits

Returned when a request attempts to process media (e.g., uploading a video) but the user has insufficient credits.

| Field       | Value                  |
| ----------- | ---------------------- |
| **code**    | `U007`                 |
| **type**    | `CLIENT_ERROR`         |
| **message** | `Insufficient credits` |
| **status**  | `400`                  |

### Example Response

```json
{
  "code": "U007",
  "type": "CLIENT_ERROR",
  "message": "Insufficient credits"
}
```

## When Are Credits Consumed?

Credits are consumed when you perform **media-processing mutations**, typically:

- Uploading media for analysis (e.g., `POST /api/media`)
- Any operation that triggers a detection run or similar computation

Operations like:

- Listing media (`GET /api/media`)
- Fetching a single media record (`GET /api/media/{mid}`)
- Deleting media (`DELETE /api/media/{mid}`)

do **not** themselves deduct credits (though the last one still counts as a Mutation for quota).

> ⚠️ Having remaining quota does **not** guarantee that you can process media.
> You must also have sufficient **credits**.

## Quotas vs Credits: How They Interact

Think of it this way:

- **Quotas** → “How many times am I allowed to call this API?”
- **Credits** → “Do I have enough balance to run this operation?”

You need **both** to succeed for media-processing mutations.

### Example Scenarios

| Situation                                    | Quota | Credits | Result                               |
| -------------------------------------------- | ----- | ------- | ------------------------------------ |
| Upload media, quota OK, credits OK           | ✅    | ✅      | Request succeeds                     |
| Upload media, quota exceeded                 | ❌    | ✅      | `AA001 – API limit reached`          |
| Upload media, quota OK, credits insufficient | ✅    | ❌      | `U007 – Insufficient credits`        |
| GET media list, query quota exceeded         | ❌    | ✅/❌   | `AA001 – API limit reached`          |
| GET media list, query quota OK               | ✅    | ✅/❌   | Request succeeds (no credits needed) |

## Monitoring Usage

From the **Settings → API Access** section, you can typically see:

- Your **total Query quota** and usage
- Your **total Mutation quota** and usage
- Per-key usage
- Your **remaining credits**

Use this view to:

- Detect when you are approaching limits
- Decide if you need to request quota increases
- Plan credit top-ups or plan changes (depending on your billing model)

## Increasing Quotas

If your integration grows and you need more capacity:

1. Go to **Settings → API Access**
2. Open your API access configuration
3. Click the option to **request a quota increase**
4. Provide new **Mutation** and **Query** values (respecting the 1.5× rule)
5. Submit the request for admin approval

After approval, your new quotas become effective. You may also need to update per-key allocations if you are using them.

## Best Practices

### 1. Start with realistic estimates

Don’t massively over-request quotas initially; start with a reasonable estimate and iterate.

### 2. Separate environments with separate keys

Use different keys (and potentially different allocations) for:

- Production
- Staging
- Testing / CI

This makes your usage patterns easier to understand.

### 3. Watch API limit errors

Handle `AA001` in your code:

- Log the error
- Optionally notify your team
- Avoid hammering the API with repeated retries

### 4. Monitor credits if you automate uploads

If you run batch jobs or pipelines, watch credits closely to avoid partially processed datasets.

## Summary

- **Quotas** limit the number of requests (Query vs Mutation)
- **Credits** are consumed by media-processing operations
- Both are enforced per **user**, with optional **per-key** allocation
- Exceeding quotas returns `AA001 – API limit reached`
- Unused quotas don’t override insufficient credits, and vice versa

## Next Steps

- [Learn how to **authenticate and call the API**](/api/authentication)
- [See practical request examples](/api/making-api-calls)
- [Explore the Media API endpoints](/api/reference/media)
