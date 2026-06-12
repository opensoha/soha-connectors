# Soha Core Integration Boundary

`soha-connectors` is an external runtime package. It must not import
`soha/internal/...`; Soha core integrates through published contracts, HTTP,
plugin marketplace records, and event/action schemas.

## Runtime Shape

The Feishu runtime entrypoint is `src/connectors/feishu/server.ts`, built to
`dist/connectors/feishu/server.js`.

```bash
npm run build
npm run start:feishu
```

The runtime owns provider-facing verification and provider API calls. Soha core
owns users, RBAC, audit, plugin install state, AI Gateway exposure, and durable
event storage.

## HTTP API

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/healthz` | none | Runtime health and reliability counters. |
| `GET` | `/manifest` | none | Connector manifest snapshot for discovery. |
| `POST` | `/webhooks/{connectorId}` | provider verification | Provider webhook ingress. |
| `POST` | `/actions/{actionName}` | `Authorization: Bearer $SOHA_CONNECTOR_HTTP_TOKEN` | Execute connector actions. |
| `GET` | `/dead-letter` | `Authorization: Bearer $SOHA_CONNECTOR_HTTP_TOKEN` | Inspect in-memory retry-exhausted action failures. |

When `SOHA_CONNECTOR_EVENT_SINK_URL` is set, normalized webhook events are
posted synchronously to that HTTP sink before the provider webhook is
acknowledged. Point the setting at the Core event sink endpoint:

```text
POST /api/v1/connectors/events
Content-Type: application/json
User-Agent: opensoha-connector-runtime/0.1
Authorization: Bearer <SOHA_CONNECTOR_EVENT_SINK_TOKEN>  # optional
```

The request body is the batch wrapper defined by
`schemas/connector-event-envelope.schema.json`:

```json
{
  "connectorId": "feishu",
  "events": [
    {
      "id": "event-1",
      "type": "im.message.receive_v1",
      "source": "feishu",
      "occurredAt": "2024-03-09T16:00:00.000Z",
      "subject": "oc_chat",
      "payload": {}
    }
  ]
}
```

`SOHA_CONNECTOR_EVENT_SINK_TOKEN` is sent as a bearer token when configured, and
`SOHA_CONNECTOR_EVENT_SINK_TIMEOUT_MS` controls the per-request timeout. A
non-2xx sink response makes the webhook endpoint return retryable `503` with
`connector_event_sink_failed`.

The action endpoint accepts:

```json
{
  "input": {
    "receiveIdType": "chat_id",
    "receiveId": "oc_xxx",
    "text": "hello"
  },
  "requestId": "optional-idempotency-or-trace-id"
}
```

`POST /actions` is also accepted when the body contains an `action` field.

## Soha Core Mapping

| Concern | Integration point | Boundary |
| --- | --- | --- |
| Plugin marketplace | `connectors/{id}/connector.manifest.json` can be referenced by a plugin package of type `connector`. | Marketplace install and enable/disable stay in Soha core. |
| Runtime discovery | Core or deployment tooling calls `/manifest` and `/healthz`. | Runtime does not mutate Soha plugin records directly. |
| Webhooks | Provider sends callbacks to `/webhooks/feishu`; the runtime can forward normalized events to `SOHA_CONNECTOR_EVENT_SINK_URL`. | Feishu verification stays in connector; durable storage, retention, and query remain Soha core responsibilities. |
| Actions | Core invokes `/actions/{actionName}` using a connector runtime token. | Core remains responsible for RBAC, AI Gateway grants, risk policy, and audit before invoking. |
| AI Gateway / MCP | Core may map connector actions into AI Gateway tools after plugin install and grants. | This runtime does not expose an MCP server; it exposes action metadata through the manifest. |
| Event schema | Runtime posts the batch wrapper validated against `schemas/connector-event-envelope.schema.json`: `connectorId` plus `events`. Each `ConnectorEvent` contains `id`, `type`, `source`, `occurredAt`, provider-specific `payload`, and optional `subject`. | The canonical schema is owned by `soha-contracts/connectors/connector-event-envelope.schema.json`; this repository keeps a mirror for package compatibility. |

## Contracts Promotion Checklist

- Keep the local `schemas/connector-event-envelope.schema.json` mirror aligned
  with `soha-contracts/connectors/connector-event-envelope.schema.json`, the
  SDK `ConnectorEvent` fields, and current Feishu `im.message.receive_v1`
  output.
- Update the contracts-owned schema first when changing the public connector
  event envelope.
- Preserve wrapper compatibility for top-level `connectorId` and `events`.
  Preserve event compatibility for `id`, `type`, `source`, `occurredAt`,
  `payload`, and optional `subject`; provider-specific fields belong under
  `payload`.
- Add Soha core ingest validation against the promoted schema before durable
  event storage, RBAC-filtered display, or AI Gateway tool exposure depends on
  connector events.
- Keep provider secrets, verification tokens, tenant access tokens, and raw
  credentials out of `payload`; runtime redaction is defense in depth, not the
  public contract.

## Reliability Boundary

The current Feishu runtime implements memory-backed reliability by default, with
optional file-backed retry queue, idempotency, and dead-letter persistence when
`SOHA_FEISHU_RELIABILITY_DIR` is set:

- webhook idempotency by normalized event ID;
- outbound action fixed-window rate limiting;
- retry with exponential backoff for HTTP 429 and 5xx Feishu responses;
- `/retry-queue` inspection for retryable final action failures;
- in-memory or file-backed dead-letter queue for retry-exhausted action
  failures;
- `/metrics` counters for webhooks, duplicates, actions, retries, and
  dead-letter entries;
- structured JSON logs with key-based redaction for secrets and tokens.

The HTTP event sink is synchronous and local-runtime scoped. Core-side
event/action query, hosted runtime storage, and Soha audit writes remain
integration responsibilities for Soha core, a managed runtime, or a future
shared connector runtime service.

Current caveat: Feishu webhook idempotency can record an event before event sink
delivery succeeds. If the sink fails and the provider retries, the retry may be
treated as a duplicate and not forwarded to the sink again.
