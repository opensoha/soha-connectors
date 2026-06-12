import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import { FileDeadLetterQueue, FileIdempotencyStore, FileRetryQueue } from "../src/sdk/reliability.js";

test("file idempotency store rejects duplicates across instances until ttl expires", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "soha-connectors-idempotency-"));
  const file = path.join(dir, "idempotency.json");
  const now = new Date("2026-06-12T00:00:00.000Z");

  const first = new FileIdempotencyStore(file);
  assert.equal(first.checkAndRecord("event:event-1", 1000, now), true);

  const second = new FileIdempotencyStore(file);
  assert.equal(second.checkAndRecord("event:event-1", 1000, now), false);
  assert.equal(second.checkAndRecord("event:event-1", 1000, new Date(now.getTime() + 1001)), true);
});

test("file dead letter queue persists redacted entries and honors max size", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "soha-connectors-dead-letter-"));
  const file = path.join(dir, "dead-letter.json");

  const queue = new FileDeadLetterQueue(file, 1);
  queue.record({
    connectorId: "feishu",
    action: "feishu.message.send_text",
    requestId: "request-1",
    error: {
      code: "rate_limited",
      message: "retry later",
      retryable: true
    },
    input: {
      text: "hello",
      token: "secret-token-value"
    },
    now: new Date("2026-06-12T00:00:00.000Z")
  });
  assert.deepEqual(queue.list()[0]?.input, {
    text: "hello",
    token: "[REDACTED]"
  });

  queue.record({
    connectorId: "feishu",
    action: "feishu.message.send_text",
    requestId: "request-2",
    error: {
      code: "feishu_api_error",
      message: "temporary",
      retryable: true
    },
    input: {
      text: "hello"
    },
    now: new Date("2026-06-12T00:00:01.000Z")
  });

  const reloaded = new FileDeadLetterQueue(file, 10);
  const entries = reloaded.list();
  assert.equal(entries.length, 1);
  assert.equal(entries[0]?.requestId, "request-2");
  assert.deepEqual(entries[0]?.input, { text: "hello" });
});

test("file retry queue persists due entries and supports completion", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "soha-connectors-retry-queue-"));
  const file = path.join(dir, "retry-queue.json");
  const queue = new FileRetryQueue(file, 10);

  const entry = queue.enqueue({
    connectorId: "feishu",
    action: "feishu.message.send_text",
    requestId: "request-1",
    attempts: 2,
    nextAttemptAt: "2026-06-12T00:00:05.000Z",
    error: {
      code: "feishu_api_error",
      message: "temporary",
      retryable: true
    },
    input: {
      text: "hello",
      token: "secret-token-value"
    },
    now: new Date("2026-06-12T00:00:00.000Z")
  });

  const reloaded = new FileRetryQueue(file, 10);
  assert.equal(reloaded.claimDue(new Date("2026-06-12T00:00:04.000Z")).length, 0);
  const due = reloaded.claimDue(new Date("2026-06-12T00:00:05.000Z"));
  assert.equal(due.length, 1);
  assert.equal(due[0]?.requestId, "request-1");
  assert.deepEqual(due[0]?.input, {
    text: "hello",
    token: "[REDACTED]"
  });
  assert.equal(reloaded.complete(entry.id), true);
  assert.equal(new FileRetryQueue(file, 10).list().length, 0);
});
