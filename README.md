# soha-connectors

This repository owns OpenSoha connector source packages and integration
scaffolding.

Connectors should integrate with Soha through published contracts, HTTP APIs,
MCP manifests, event schemas, or other explicit extension points. Do not import
`soha/internal/...`, and do not move SaaS-only lifecycle, billing, quota, or
cloud operations logic into this repository.

## Layout

```text
soha-connectors/
  connectors/
    feishu/
    wechat/
    wecom/
    gitlab/
    jira/
```

The current directories are placeholders for future connector implementations.
They intentionally contain no business logic.

## Boundary

- Keep connector implementations independent from the open-source core source
  tree.
- Prefer contracts, generated SDKs, HTTP APIs, MCP manifests, event schemas, and
  published artifacts over source-level coupling.
- Hosted or cloud-only connector operations belong in `soha-cloud`.

## License

This repository is licensed under the Apache License 2.0. See
[LICENSE](./LICENSE) for the full license text.
