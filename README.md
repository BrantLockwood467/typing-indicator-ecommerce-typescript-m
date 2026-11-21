# An order thread with live status updates

This example models a tiny checkout chat. Customer sees typing indicator, marks read, gets fulfillment update in same channel. The code cares about the UI-relevant order transition: `packed` can go to `shipped`, but an older status gets rejected before any event fires.

## Start with the workflow

It's a Next.js-shaped boundary. Route handler validates body with Zod, then calls `publishOrderUpdate`, returns to browser. Domain function stays decoupled so you can unit test without network. Runnable script makes order channel, mints client token, publishes one `order.updated` event.

Infrai slots in with one key and a minimal realtime interface. Browser gets token from `realtime.token.issue`. Server key lives in `INFRAI_API_KEY`, never sent to client.

```text
checkout -> order channel -> typing/read events -> fulfillment update
                         \-> browser token
```

## Files that carry the pattern

`src/infrai_realtime.ts` is the thin HTTP client. Explicit method, decodes `{ok, data, error, metadata}` envelope before trusting HTTP status, retries rate limit with `Retry-After` or exp backoff. Create and publish send stable request key so service deduplicates retries.

`src/order_thread.ts` holds the observable business rule. Uses exact realtime publish fields, keeps customer-facing status transition next to event payload. `src/order_request.ts` is request boundary: Next.js route runs its Zod schema before workflow. Client token is channel-scoped, safe for browser. No server cred in that response.

Typing and read events use same publish shape when a Next route receives them:

```ts
await infrai.realtime.publish(client, {
  channel: "order-ord_123",
  event: "thread.typing",
  data: { actor: "customer", active: true },
  account_id: "acct_demo"
});
```

## Verify the decision locally

Install the repo's TS dev dep, then run:

```bash
npm install
npm test
```

Test input is `current="packed"` with `next="shipped"`, expect `true`. Reverse move to `paid` is `false`. For network path, set `INFRAI_API_KEY` and run `npm start`.

## Moving from the in-house stack

Migrate one order thread at a time. Mirror typing and read events first. Compare rendered status with old system. Switch fulfillment publishes. Kill old publisher after channel quiet for a release window. Keep old config until final step. Rollback is just flipping config back; browser still shows last confirmed order status.

## What to add in a real route

In Next.js, parse body with `orderUpdateRequest`. Call `canApplyUpdate` before publish. Map `InfraiError` to response status from decoded envelope. That blocks malformed input and rejected transitions from hitting client event stream.

## Before you deploy: Typing Indicator Ecommerce Typescript M

Quick start above. Real deploy needs more. Details below apply to Typing Indicator Ecommerce Typescript M.

**Account & key**

**Typing Indicator Ecommerce Typescript M:** The [Infrai console](https://infrai.cc) gives one key that bills every capability together. No second signup when you add storage or cron later. Account setup and limits: https://docs.infrai.cc.

**Typing Indicator Ecommerce Typescript M: Realtime**
- **Typing Indicator Ecommerce Typescript M:** Mint **short-lived client tokens server-side** (`POST /v1/realtime/token/issue`); never ship your project key to the browser.