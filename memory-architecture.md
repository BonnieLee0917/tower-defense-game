# OpenClaw Agent 记忆系统架构

## 一、总览

三层记忆系统并行运作，各有分工：

```
┌─────────────────────────────────────────────────┐
│                 Agent Session                     │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ LanceDB   │  │ Knowledge │  │ File System  │ │
│  │ (向量+BM25)│  │  Graph    │  │ (Markdown)   │ │
│  │ 实时写/读  │  │ 离线提取   │  │ 手动+自动    │ │
│  └─────┬─────┘  └─────┬─────┘  └──────┬───────┘ │
│        │              │               │          │
│        ▼              ▼               ▼          │
│   autoRecall     search.sh        read file      │
│  (每轮自动注入)  (graph→grep)    (按需读取)       │
└─────────────────────────────────────────────────┘
```

## 二、Layer 1 — LanceDB-Pro（实时语义记忆）

**角色：** 短期→中期记忆，自动捕获对话中的关键信息

**技术栈：**
- 存储：LanceDB（列式向量数据库），本地文件 `~/.openclaw/memory/lancedb-pro/`，约 19MB
- Embedding：阿里云 Dashscope `text-embedding-v4`，1024 维
- LLM（提取/反思）：`qwen-turbo-latest`
- 检索模式：Hybrid（向量 0.7 + BM25 关键词 0.3）

**生产链路（写入）：**

| 触发 | 机制 | 说明 |
|------|------|------|
| **autoCapture** | 每轮 assistant 回复后自动触发 | smart-extractor 用 LLM 判断这轮对话有没有值得记的东西，有则提取为结构化记忆 |
| **memory_store** | Agent 主动调用工具 | 显式存储偏好、事实、决策等 |
| **ruminate** | 每天 03:30 cron | 反思引擎——把零散记忆蒸馏成更高层的 pattern/reflection |

**消费链路（读取）：**

| 触发 | 机制 | 说明 |
|------|------|------|
| **autoRecall** | 每次收到用户消息时自动触发 | 用用户消息做语义检索，命中的记忆注入到上下文开头的 `relevant-memories` 块 |
| **memory_recall** | Agent 主动调用工具 | 手动语义搜索 |

**记忆分类（scopes）：**
- `preference` — 用户偏好
- `fact` — 事实信息
- `decision` — 决策记录
- `entity` — 人物/项目实体
- `reflection` — 反思总结
- `cases` — 操作案例
- `patterns` — 行为模式

**生命周期管理：**
- Weibull 衰减函数——记忆有半衰期，不重要的自然过期
- 被检索到的记忆会获得强化（reinforcementFactor: 0.5），延长生命周期
- `lancedb-daily-sync`（03:15 cron）做碎片整理和 compaction

**优点：**
- 零配置，全自动——对话即记忆
- 语义检索能找到"意思相近但措辞不同"的内容
- 实时性好，当轮对话结束就写入

**缺点：**
- LLM 提取有判断误差——有时该记的没记，不该记的记了
- 语义检索在短查询（<15 字）时效果差
- 存储不透明——用户看不到、不能直接编辑记忆内容
- 成本：每轮对话多一次 LLM 调用（qwen-turbo，成本极低约 ¥0.84/月）

---

## 三、Layer 2 — 知识图谱（结构化关系记忆）

**角色：** 长期结构化知识，实体之间的关系网络

**技术栈：**
- 存储：SQLite `memory/graph.db`，约 2.3MB
- 提取 LLM：`qwen3.5-plus`（比 turbo 更强的推理能力）
- 当前规模：4039 个实体，5937 个关系

**生产链路（写入）：**

| 触发 | 频率 | 数据源 |
|------|------|--------|
| `nightly` cron | 每天 03:05 | 当天 daily log（`memory/YYYY-MM-DD.md`）|
| `nightly` cron | 每天 03:05 | 当天 session 对话记录（`session-extract.py` 导出）|

**提取流程：**
```
daily log / session 对话
    ↓
graph-extract.sh（调 qwen3.5-plus）
    ↓
LLM 输出 JSON：entities + relations
    ↓
graph.py 写入 SQLite
    ↓
graph-prune.py 清理过期/冗余节点
```

**消费链路（读取）：**

| 方式 | 说明 |
|------|------|
| `search.sh`（Tier 1） | 统一搜索入口，优先查图谱 |
| `graph.py find <query>` | 关键词模糊搜索实体和关系 |
| `graph.py context <id>` | 查某个实体的完整上下文（所有关联） |

**数据模型：**
```
Entity: { id, type, props (JSON) }
  type: person | project | server | service | tool | lesson | ...

Relation: { src, rel, dst, props (JSON) }
  rel: uses | depends_on | runs_on | knows | tests | ...
```

**优点：**
- 结构化——能回答"A 和 B 什么关系""项目用了哪些服务"这类关系查询
- 持久化——不会衰减，除非主动 prune
- 可解释——能看到具体的实体和关系

**缺点：**
- 离线提取——只在凌晨跑，当天的新信息要等到明天才进图谱
- 提取质量依赖 LLM——实体去重不完美（同一个东西可能有多个 ID）
- 不支持语义检索——只能关键词匹配

---

## 四、Layer 3 — 文件系统（人工策展记忆）

**角色：** 最可靠的长期记忆，人工维护的权威信息

**结构：**
```
workspace/
├── SOUL.md          — Agent 人格定义（行为准则、风格）
├── IDENTITY.md      — 身份信息
├── USER.md          — 用户信息
├── MEMORY.md        — 索引层（人物、Agent 拓扑、参考指针）
├── AGENTS.md        — 工作规则
├── TOOLS.md         — 工具使用规则
├── HEARTBEAT.md     — 定时任务定义
├── PROJECTS.md      — 项目索引
└── memory/
    ├── YYYY-MM-DD.md        — 每日原始日志（53 天）
    ├── ops-reference.md     — 运维参考
    ├── tools-reference.md   — 工具参考
    ├── lessons.md           — 经验教训
    ├── dale-profile.md      — 用户画像
    ├── cindy-milestones.md  — 成长记录
    ├── topics/              — 蒸馏知识（20 个文件）
    └── projects/            — 项目知识
```

**生产链路：**
- workspace 根目录的 `.md` 文件在每次 session 启动时**自动注入到系统上下文**
- `memory/` 下的文件按需 `read`
- daily log 由 Agent 在对话中自动追加
- 人工编辑（Dale 或 Agent 主动维护）

**消费链路：**
- **自动加载**：SOUL/IDENTITY/USER/MEMORY/AGENTS/TOOLS/HEARTBEAT — 每次对话都在上下文里
- **`search.sh` Tier 2**：memsearch.py 对 memory/ 做 embedding 语义搜索
- **`search.sh` Tier 3**：grep 精确匹配
- **直接 read**：Agent 按需读取特定文件

**优点：**
- 最可靠——人工维护，内容可控
- 可见可编辑——用户和 Agent 都能直接查看修改
- 启动即可用——不需要检索

**缺点：**
- 上下文窗口有限——workspace 文件总量需要控制（lint 阈值 5000 字符/文件）
- 手动维护成本——信息过时需要人工发现和更新
- 不可扩展——不能把所有信息都塞进 workspace 文件

---

## 五、统一检索优先级

```
用户提问
  ↓
1. autoRecall（自动）— LanceDB 语义检索，命中即注入上下文
  ↓
2. search.sh — graph（关键词）→ memsearch（语义）→ grep（精确）
  ↓
3. memory_recall — 手动 LanceDB 语义搜索
  ↓
4. web_search — 外部信息
```

**硬约束：不允许跳级。** 必须按顺序走，第一个命中即停。

---

## 六、定时维护 Pipeline

每天凌晨，8 个 cron 任务按序执行：

```
03:05  nightly          — 知识图谱提取（日志+会话）+ prune + lint
03:10  lynx-nightly     — Lynx 图谱 + 备份 + Bark 汇总通知
03:15  lancedb-sync     — Cindy LanceDB 碎片整理
03:20  lynx-lancedb     — Lynx LanceDB 碎片整理
03:30  ruminate          — Cindy 记忆反思（零散→pattern/reflection）
03:35  lynx-ruminate    — Lynx 记忆反思
```

另外两个高频任务：
```
*/15   sensor-sweep     — 每 15 分钟检查 4 台服务器健康
*/2h   preconscious     — 每 2 小时，从记忆中浮现可能需要关注的事项
```

---

## 七、未来优化方向

| 方向 | 说明 | 难度 |
|------|------|------|
| **图谱实时化** | 对话中实时提取实体/关系，不等 nightly | 中 — 需要在 autoCapture 链路里加图谱写入 |
| **记忆可视化** | 给用户一个 dashboard 看到 Agent 记住了什么 | 低 — 类似 AgentPostal 的方式 |
| **跨 Agent 记忆共享** | Cindy/Lynx/Dally/Gary 共享部分记忆 | 中 — scope 机制已有，需要定义共享策略 |
| **记忆冲突检测** | 新记忆与旧记忆矛盾时自动标记 | 高 — 需要语义比对 |
| **主动遗忘** | 基于 importance + 访问频率的智能遗忘 | 低 — Weibull 衰减已有基础 |
| **对话摘要压缩** | session 过长时自动 summarize 历史 | 低 — compaction safeguard 模式已有 |
