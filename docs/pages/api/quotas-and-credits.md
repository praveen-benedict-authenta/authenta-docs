## Concepts Overview

### Credits

Credits represent your ability to **process media** (for example, analyzing videos).

Key points:

- Processing media **via API** consumes credits
- Processing media **via UI** also consumes credits
- Credits are shared between UI and API usage
- Non-processing operations (like fetching metadata) do **not** consume credits
- There are no API call quotas — you can make unlimited requests, but media processing is limited by credit balance

## API Calls vs Credit Consumption

With the new API key system, there are no limits on the number of API calls you can make:

- **Read operations** (e.g., `GET` requests) → Unlimited, no credits consumed
- **Write operations** (e.g., `POST`, `PUT`, `DELETE`) → Unlimited API calls, but **media processing consumes credits**

Your account balance is the limiting factor for media processing operations, not API call quotas.

# Error Codes Related to Credits

Authenta uses structured error objects with a code, statusCode, and message.

Here are the relevant errors for credit issues.

## ❌ INSUFFICIENT_BALANCE — Insufficient Credits

Returned when a request attempts to process media (e.g., uploading a video) but the user has insufficient credits.

| Field          | Value                                                      |
| -------------- | ---------------------------------------------------------- |
| **code**       | `INSUFFICIENT_BALANCE`                                     |
| **statusCode** | `402`                                                      |
| **message**    | `Insufficient balance. Please top up or enable pay-as-you-go billing` |

### Example Response

```json
{
  "code": "INSUFFICIENT_BALANCE",
  "statusCode": 402,
  "message": "Insufficient balance. Please top up or enable pay-as-you-go billing"
}
```

## When Are Credits Consumed?

Credits are consumed when you perform **media-processing operations**, typically:

- Uploading media for analysis (e.g., `POST /api/media`)
- Any operation that triggers a detection run or similar computation

Operations like:

- Listing media (`GET /api/media`)
- Fetching a single media record (`GET /api/media/{mid}`)
- Deleting media (`DELETE /api/media/{mid}`)

do **not** consume credits.

> ⚠️ API calls are unlimited. Credits are only consumed when **processing media**.

### Example Scenarios

| Situation                                    | Credits | Result                                                             |
| -------------------------------------------- | ------- | ------------------------------------------------------------------ |
| Upload media, credits OK                     | ✅      | Request succeeds                                                   |
| Upload media, credits insufficient           | ❌      | `INSUFFICIENT_BALANCE` (402) - Insufficient balance message |
| GET media list                               | ✅/❌   | Request succeeds (no credits needed)                              |
| DELETE media record                          | ✅/❌   | Request succeeds (no credits needed)                              |

## Monitoring Usage

From the **Settings → Billing** section, you can typically see:

- Your **current credit balance**
- Your **credit usage history**
- Your **API key** usage statistics

Use this view to:

- Check your remaining credits
- Plan credit top-ups or plan changes (depending on your billing model)
- Review API activity across your keys

## Managing Credits

If you're running low on credits:

1. Go to **Settings → Billing**
2. Review your credit balance and usage
3. Top up your credits or upgrade your plan

Unlike quotas, there's no approval process — credits are immediately available after purchase.

## Best Practices

### 1. Separate environments with separate keys

Use different API keys for:

- Production
- Staging
- Testing / CI

This makes your usage patterns easier to understand and track.

### 2. Monitor credit balance

If you run batch jobs or pipelines, watch credits closely to avoid partially processed datasets.

### 3. Handle insufficient credit errors

Handle `INSUFFICIENT_BALANCE` in your code:

- Log the error
- Notify your team to top up credits
- Implement retry logic with backoff

### 4. Review usage regularly

Check your API key usage and credit consumption regularly to plan budget and scaling.

## Summary

- No API call quotas — make unlimited requests to the API  
- Credits are consumed only when processing media files
- Each media file operation consumes a variable number of credits (based on file size and operation type)
- Monitor your credit balance regularly via Settings → Billing
- Failed operations after `INSUFFICIENT_BALANCE` error don't consume credits
- Use separate API keys for production, staging, and testing environments

## Next Steps

- [Learn how to **authenticate and call the API**](/api/authentication)
- [See practical request examples](/api/making-api-calls)
- [Explore the Media API endpoints](/api/reference/media)
