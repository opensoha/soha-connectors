# Soha Connectors 仓库入口

- 本仓负责独立连接器、provider runtime、manifest 和发布包；不依赖 `soha/internal/**`，保留签名校验和 secret 引用边界。
- 在 OpenSoha 多仓工作区中读取 `../AGENTS.md` 一次；独立克隆时使用本仓规则，不要求初始化相邻仓库或规划工具。
- 连接器实现或审查按需使用 [soha-connectors](.agents/skills/soha-connectors/SKILL.md)，公开格式通过 contracts 与 Core 对齐。
- 按改动验证受影响连接器；主入口为 `npm run check`。打包、依赖或发布变更使用 [CI](.github/workflows/ci.yml)、发布流程和包脚本规定的完整门禁。
- 文档和技能改动只检查内容、链接与差异；相关代码和环境未变化时复用成功验证，保留用户未提交改动。
