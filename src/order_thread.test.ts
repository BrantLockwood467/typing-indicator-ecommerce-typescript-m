import assert from "node:assert/strict";
import test from "node:test";
import { canApplyUpdate } from "./order_thread.ts";

test("an order can move from packed to shipped, but not back to paid", () => {
  assert.equal(canApplyUpdate("packed", "shipped"), true);
  assert.equal(canApplyUpdate("packed", "paid"), false);
});
