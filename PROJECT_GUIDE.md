# Veritab 敏捷研发管理平台

**项目名称**：Veritab Agile Platform
**目标规模**：支持 100-200 人并发生产使用

---

## 项目信息

- **定位**：一站式敏捷研发、需求协作、质量保障管理系统
- **核心功能**：空间概览、敏捷需求看板、缺陷管理、测试用例脑图编辑、代码变更追溯、飞书/企业微信/钉钉协同、系统配置与权限管理
- **前端已提供**：完整代码压缩包 + 清晰的目录结构（components/ 下包含 ProjectSpace.tsx、RequirementsBoard.tsx、DefectsBoard.tsx、TestCaseXMindMindmap.tsx 等关键组件）


---

### 第一阶段：架构设计

```markdown
你现在是10年以上经验的全栈架构师 + 高级 DevOps + 安全专家 + 敏捷开发工具专家。

**项目名称**：Veritab 敏捷研发管理平台 (Veritab Agile Platform)

**项目定位**：一站式敏捷研发、需求协作、质量保障管理系统。核心目标是集成敏捷迭代、测试用例脑图编辑、缺陷追踪、代码变更联动、多渠道机器人协同等效能工具，帮助研发团队提升协作效率。

**目标规模**：支持100-200人同时在线使用，需具备良好的可扩展性和生产级稳定性。

**现有材料**：
- 前端代码（Vite + React 18 + TypeScript + Tailwind CSS + motion + lucide-react + d3/recharts），已上传压缩包。
- 前端目录结构清晰（以 components/ 为主，包含 ProjectSpace.tsx、RequirementsBoard.tsx、DefectsBoard.tsx、TestCaseXMindMindmap.tsx 等关键组件）。

**你的任务**：
将这个前端 Demo 升级为完整、生产可用、可商用的全栈项目。

### 第一阶段：请先完成架构设计

1. **分析现有前端**：
   - 评估当前技术栈优缺点
   - 指出潜在的架构问题（状态管理、API 调用、数据持久化、性能等）
   - 给出优化建议

2. **完整架构方案**（必须包含以下内容）：
   - **后端推荐技术栈**及充分理由（建议 NestJS + TypeScript 或 FastAPI）
   - **数据库**：推荐 PostgreSQL，使用 Prisma
   - **核心技术选型**：
     - 认证授权（JWT + Refresh Token + SSO 支持）
     - 权限模型（细粒度 RBAC，支持项目空间内权限）
     - 缓存（Redis）
     - 文件/图片存储方案
     - 异步任务与 Webhook（飞书/企业微信/钉钉）
     - Git 集成（代码变更关联）
   - **整体目录结构**（前后端）
   - **部署方案**（Docker + docker-compose + 生产环境建议）
   - **可扩展性设计**（后续支持更多用户和模块）

请详细输出以上内容，等待我确认后再进入下一阶段。


### 第二阶段：后端基础建设

架构已确认，我们按计划继续。

**请按以下顺序逐步实现**（每次完成一个大模块后等待我确认）：

1. **初始化后端项目**（使用推荐技术栈）
   - 创建完整项目结构
   - 配置 Prisma（或对应 ORM）+ 数据库连接
   - 环境变量配置（.env.example）

2. **核心基础模块**（优先完成）：
   - 用户管理（User + Organization + Project Space）
   - 认证系统（登录、注册、JWT、Refresh Token、SSO 预留）
   - 权限与 RBAC（项目空间级 + 角色权限）
   - 全局中间件（日志、异常处理、请求验证、限流）

3. **数据库 Schema 设计**：
   请先输出核心实体（使用 Prisma schema 格式）：
   - User, Organization, ProjectSpace
   - Requirement, Defect, TestCase, TestCaseNode（脑图节点）
   - CodeChange, Iteration/Sprint
   - Notification, WebhookConfig 等

请先生成数据库 Schema 和基础用户/权限模块。


### 第三阶段：业务模块开发
每次使用以下模板（替换模块名称和描述）：

现在我们开发【需求协作模块 (Requirements Board)】。

**模块需求**：
- 敏捷看板式需求流转
- 支持新建、编辑、全维度属性管理、状态流转
- 与缺陷、测试用例、代码变更关联

**前端已有组件**：RequirementsBoard.tsx

请按以下步骤实现：
1. 后端：Entity / Schema 更新、Service、Controller、DTO（带完整 Swagger 注释）
2. API 设计（RESTful，合理的端点和分页、筛选）
3. 前端适配：修改/添加 API 调用层（强烈建议使用 TanStack Query），保持原有 UI 逻辑
4. 输出完整代码和修改说明

请开始。

推荐模块开发顺序：

用户 + 权限 + 项目空间
需求协作
缺陷管理
测试保障（含 TestCaseXMindMindmap 脑图的保存与加载）
飞书/企业微信/钉钉协同
系统配置面板
代码变更关联


### 第四阶段：项目收尾（最后使用）

所有核心模块已完成，进入最终收尾阶段：

1. 全局错误处理、中间件、日志、限流
2. 安全加固（OWASP Top 10、输入验证、认证安全等）
3. 性能优化与 Redis 缓存策略
4. Docker + docker-compose 配置（开发和生产环境）
5. CI/CD 基础建议
6. 完整部署文档和初始化脚本
7. 整体代码 Review、安全审计与优化建议

请开始收尾工作。