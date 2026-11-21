import { z } from "zod";

export const orderUpdateRequest = z.object({
  orderId: z.string().min(1),
  status: z.enum(["paid", "packed", "shipped", "delivered"]),
  note: z.string().min(1)
});

export type OrderUpdateRequest = z.infer<typeof orderUpdateRequest>;
