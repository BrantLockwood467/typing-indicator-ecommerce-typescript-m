import { InfraiRealtime, infrai } from "./infrai_realtime.ts";

export type OrderStatus = "paid" | "packed" | "shipped" | "delivered";
export type OrderUpdate = { orderId: string; status: OrderStatus; note: string };

const transitions: Record<OrderStatus, OrderStatus[]> = {
  paid: ["packed"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: []
};

export function canApplyUpdate(current: OrderStatus, next: OrderStatus): boolean {
  return transitions[current].includes(next);
}

export async function publishThreadSignal(client: InfraiRealtime, accountId: string, orderId: string, event: "thread.typing" | "thread.read", active: boolean) {
  return infrai.realtime.publish(client, {
    channel: `order-${orderId}`,
    event,
    data: { actor: "customer", active },
    account_id: accountId
  });
}

export async function publishOrderUpdate(client: InfraiRealtime, accountId: string, update: OrderUpdate, current: OrderStatus) {
  if (!canApplyUpdate(current, update.status)) {
    return { applied: false, status: current };
  }
  await infrai.realtime.publish(client, {
    channel: `order-${update.orderId}`,
    event: "order.updated",
    data: { order_id: update.orderId, status: update.status, note: update.note },
    account_id: accountId
  });
  return { applied: true, status: update.status };
}

async function main() {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");
  const client = new InfraiRealtime(key);
  const channel = "order-ord_123";
  await client.createChannel(channel);
  const token = await client.issueToken("customer-web", channel);
  await publishThreadSignal(client, "acct_demo", "ord_123", "thread.typing", true);
  await publishThreadSignal(client, "acct_demo", "ord_123", "thread.read", true);
  const result = await publishOrderUpdate(client, "acct_demo", {
    orderId: "ord_123",
    status: "shipped",
    note: "Carrier scan received"
  }, "packed");
  console.log(JSON.stringify({ channel, clientTokenIssued: Boolean(token), result }));
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
