# Soha Connectors 仓库入口

- 本仓负责独立连接器、provider runtime、manifest 和发布包；不依赖 `soha/internal/**`，保留签名校验和 secret 引用边界。
- 在 OpenSoha 多仓工作区中读取 `../AGENTS.md` 一次；独立克隆时使用本仓规则，不要求初始化相邻仓库或规划工具。
- 连接器实现或实质审查前读取 [soha-connectors](.agents/skills/soha-connectors/SKILL.md) 及本次相关参考，不只依赖技能自动匹配。公开格式通过 contracts 与 Core 对齐；已读且未变化的内容可复用。
- 按改动验证受影响连接器；主入口为 `npm run check`。打包、依赖或发布变更使用 [CI](.github/workflows/ci.yml)、发布流程和包脚本规定的完整门禁。
- 文档和技能改动只检查内容、链接与差异；相关代码和环境未变化时复用成功验证，保留用户未提交改动。

## 变更与验收边界

- 修改前明确 provider、SDK、manifest 或公开事件的真实源、调用者和验证入口。Provider 特性留在对应连接器，只有已证实的共同语义才进入 SDK；不复制 Core 或 Cloud 业务逻辑。
- 修改 SDK 默认行为时检查受影响连接器，不能把共享变更按单 provider 小修复验收。局部修改不顺手扩展重试、权限或全局默认配置。
- 能力声明以实际实现和运行证据为准；旧 catalog 不证明当前可用。保留签名验证、重放/幂等控制、限流、生命周期、错误脱敏和有界重试的正反例测试。
- 公开 event/manifest 变化先更新 contracts，再同步本仓已有消费路径；不得通过另建本地格式或放宽校验来规避不兼容。
- 记录提交、契约/SDK 版本、命令和 pass/fail/skip/not-run。Mock 测试、打包检查与真实 provider 联调分开报告；缺少凭据不算联调通过，也不授权使用生产凭据。
- 历史计划和技能描述不自动授权安装、外部写入或发布；只处理本次授权范围内的依赖和消费者。
