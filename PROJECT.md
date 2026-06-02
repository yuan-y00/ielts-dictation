# IELTS Dictation Practice — 项目档案

> 最后更新：2026-06-01

---

## 一、项目概述

雅思听写练习工具，用户**看着英文句子在键盘上抄写**，同时播放 TTS 音频。部署在 GitHub Pages，纯静态前端。

**在线地址**：https://yuan-y00.github.io/ielts-dictation/

**GitHub 仓库**：https://github.com/yuan-y00/ielts-dictation

---

## 二、用户需求历史

### 最初需求

做一个雅思听写工具，页面分为 5 块，按材料顺序排列：

1. 剑桥雅思 17-18（听力/阅读真题句子）
2. Simon 写作范文 40 篇（高分句型）
3. 雅思哥当前口语题库（口语话题表达）
4. 王陆语料库第 3/4/5 章（高频词汇及例句）
5. 刘洪波同义替换表（同义词对）

每块功能：
- 显示一句英文，左边有喇叭图标
- 下方是抄写区域
- 抄写键：按动后光标跳到抄写处，同时播放句子音频
- 声音要自然
- 按 Enter 播放下一句，光标跳到下一句抄写处
- 每块有进度条

### 关键澄清

- **用户是看着英文句子抄写**，不是默写，所以不需要"显示答案"功能
- 一页显示多个卡片，纵向排列
- 同义替换表：词对显示 + TTS 按顺序读单词 + 用户按顺序抄写
- 版权无需考虑（自用）
- 材料真实性非常重要，不允许瞎编，不允许漏放
- 先从 Simon 写作 40 篇开始

### 后期优化需求

- 去掉"Simon Writing Collection · 40 Model Essays"副标题
- 去掉卡片编号 1、2、3
- 喇叭放上面、抄写键放下面
- 加中文直译
- 整篇范文完整可见，不是碎片卡片
- 区分大作文（Task 2）和小作文（Task 1），中文翻译颜色区分
- 喇叭和抄写只保留图标，竖排在英文/中文例句右边
- 题目翻译中文
- 英文/中文例句左对齐
- 英文用系统无衬线字体（Georgia 累眼）
- 抄写框改为下划线极简样式
- 去掉 Task 类型标签（大作文·TASK 2 等）
- 抄完后输入框消失，喇叭保留，铅笔变绿色对勾
- 右下角按钮左半跳转到第一个未完成的句子
- 按 Enter 自动播放下一句音频

---

## 三、设计规范参考（nice-pdf-skill）

来源：`D:\Yuan\ielts\theme\nice-pdf-skill-main\SKILL.md`

### 核心原则

1. **先规划再动手**
2. **避免 Inter/Roboto/Arial**，使用有特色的字体
3. **紧凑间距，呼吸感**

### 配色方案（暖色系）

| 变量 | 色值 | 用途 |
|------|------|------|
| `--cream` | `#FFF8F0` | 卡片背景 |
| `--cream-dark` | `#F5EDE0` | 页面背景 |
| `--navy` | `#3D5A80` | 主色，互动元素 |
| `--navy-dark` | `#2A3F5A` | 标题 |
| `--sage` | `#81B29A` | Task 1 强调色，进度条 |
| `--sage-dark` | `#5E8F74` | 正确状态 |
| `--terracotta` | `#E07A5F` | 错误提示，hover 色 |
| `--charcoal` | `#2B2D42` | 正文 |
| `--soft-peach` | `#F4ACB7` | 辅助暖色 |

### 排版规范

- 组件高度精确估算
- 分隔线系统化
- 组件 `page-break-inside: avoid` 整体不切断
- `section-label` 模式：小号标签 + 标题

---

## 四、当前文件结构

```
ielts-dictation/
├── index.html                  # 主页面
├── css/
│   └── style.css               # 完整样式（nice-pdf 体系）
├── js/
│   ├── app.js                  # 主逻辑：渲染、事件、状态管理
│   ├── tts.js                  # Web Speech API TTS 封装
│   └── storage.js              # localStorage 进度持久化
├── data/
│   └── simon-writing.json      # 21 篇 Simon 范文数据
├── build_data.py               # 数据生成脚本
├── .gitignore
├── PROJECT.md                  # 本文件
└── README.md                   # （待创建）
```

---

## 五、数据概况

### Simon 写作范文全集

| 类型 | 篇数 | 句数 | 备注 |
|------|------|------|------|
| Task 2（大作文） | 16 篇 | ~200 句 | 话题涵盖教育、科技、环境、社会等 |
| Task 1（小作文） | 5 篇 | ~51 句 | 折线图×2、柱形图、饼图、流程图 |
| **合计** | **21 篇** | **251 句** | 全部来自 Simon Corcoran (ielts-simon.com) |

### Task 2 范文列表

| # | 标题 | 话题 |
|---|------|------|
| 1 | Minority Languages | Should governments spend money saving endangered languages? |
| 2 | University vs. Job After School | Is university the best route to a successful career? |
| 3 | Museums — Entertainment vs. Education | Should museums entertain or educate? |
| 4 | Gender Equality in University | Equal numbers of male/female students in every subject? |
| 5 | Strict Punishments for Driving Offences | Punishments vs. other measures for road safety? |
| 6 | High Salaries / Maximum Wage | Should there be a cap on earnings? |
| 7 | Traditional & Religious Festivals | Have people forgotten the meaning of festivals? |
| 8 | Technology and Traditional Cultures | Are technology and traditional cultures incompatible? |
| 9 | Online University Courses | Is online education positive or negative? |
| 10 | Fathers as Househusbands | Why are more fathers staying home? |
| 11 | Technology & Relationships | How has tech affected relationships? |
| 12 | Living Alone | Is more people living alone positive or negative? |
| 13 | University Subject Choice | Free choice vs. only useful subjects? |
| 14 | Ex-Prisoners Speaking to Teenagers | Are reformed criminals best to warn teens? |
| 15 | Traditional Views and Modern Life | Are older generations' ideas still helpful? |
| 16 | Foreign Films vs. Local Film Industry | Why prefer foreign films? Should govts support local cinema? |

### Task 1 范文列表

| # | 标题 | 题型 |
|---|------|------|
| 1 | Internet Users | Line Graph |
| 2 | UK Immigration & Emigration | Line Graph |
| 3 | Marriages and Divorces | Bar Chart |
| 4 | Electricity Production | Pie Chart |
| 5 | Brick Manufacturing | Process Diagram |

### 数据结构

```javascript
// 顶层
{
  "id": "simon-writing",
  "icon": "📝",
  "title": "Simon 写作范文全集 — Task 1 & Task 2",
  "essays": [...]
}

// 单篇 essay
{
  "id": "t2-01",
  "title": "Minority Languages",        // 英文章名
  "titleCn": "少数民族语言",            // 中文篇名
  "topic": "Should governments...",     // 话题英文（主标题）
  "topicCn": "政府是否应该...",          // 话题中文
  "taskType": "task2",                  // task2 | task1
  "band": 9,
  "wordCount": 258,
  "chartType": "process",               // 仅 Task 1
  "sentences": [
    {
      "english": "It is true that...",
      "chinese": "确实，一些..."
    }
  ]
}
```

---

## 六、技术架构

### 技术栈

- **部署**：GitHub Pages（纯静态）
- **前端**：原生 HTML/CSS/JS，零依赖
- **TTS**：Web Speech API（浏览器原生）
- **存储**：localStorage（进度持久化）

### 核心模块

#### 1. `js/tts.js` — TTS 引擎

- 封装 Web Speech API `SpeechSynthesisUtterance`
- 自动检测最佳英文语音（Google US/UK → Microsoft Zira/David → 系统默认）
- Chrome 长句断开 bug 修复（5s 间隔 pause/resume）
- 支持顺序朗读单词序列（同义替换表场景）

#### 2. `js/storage.js` — 进度存储

- Key: `ielts-dictation-progress`
- 结构：`{ [essayId]: { completed: [0, 1, 3, ...] } }`
- 记录每个 essay 中已完成的句子索引
- 额外存储最后活跃位置 `lastEid` / `lastIdx`

#### 3. `js/app.js` — 主应用

- **渲染**：essay 块 → 句子行（英文 + 中文 + 输入框 | 操作按钮）
- **事件**：点击 🔊 播放 / ✏️ 开始抄写 / Enter 校验
- **对比**：规范化标点空格后比较（`word,word` = `word, word`）
- **状态**：activeEssayId / activeSentIdx 跟踪当前位置
- **自动模式**：抄完一句自动播放下一句
- **浮动导航**：右下角 📍跳未完成 / ⬆回顶

### 页面布局结构

```
┌─────────────────────────────────────────────────┐
│  IELTS Dictation                        (Header) │
├─────────────────────────────────────────────────┤
│  📝 Simon 写作范文全集  ████████░░░  48/251     │
│  [Auto Dictation] [Replay] [Reset]              │
├─────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐│
│  │ Should governments spend money saving...   ││ ← 话题 (主标题)
│  │ 政府是否应该花钱拯救濒危的少数民族语言？    ││ ← 话题中文 (navy)
│  │ Task 2·大作文  Minority Languages  少数民族 ││ ← 辅助信息 (小字灰)
│  ├──────────────────────────────────┬──────────┤│
│  │ It is true that some minority... │   🔊     ││
│  │ 确实，一些少数民族语言...        │   ✏️     ││
│  │ _____________________________   │          ││
│  ├──────────────────────────────────┼──────────┤│
│  │ Although it can be argued...     │   🔊     ││
│  │ 虽然有人认为...                  │   ✏️     ││
│  │ _____________________________   │          ││
│  └──────────────────────────────────┴──────────┘│
│                                                  │
│  ┌─────────────────────────────────────────────┐│
│  │ When they finish school, teenagers face...  ││ ← 下一篇 essay
│  │ ...                                         ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
                                      ┌──────┬──────┐
                                      │  📍  │  ⬆  │ (浮动导航)
                                      └──────┴──────┘
```

---

## 七、交互流程

```
用户看到句子
    │
    ├── 点击 🔊 → 播放音频（喇叭脉冲动画）
    │
    ├── 点击 ✏️ → 播放音频 + 聚焦输入框 + 选中文本
    │
    ├── 在输入框打字
    │
    └── 按 Enter
            │
            ├── 正确 ✅
            │   ├── 输入框消失
            │   ├── ✏️ → ✅ 绿色对勾
            │   ├── 🔊 保留
            │   ├── Toast: "✓ Perfect!"
            │   ├── 进度条更新
            │   └── 自动跳到下一句 + 播放音频
            │
            └── 错误 ❌
                ├── 底线变红 1.5s
                ├── 显示对比（参考 vs 你写）
                └── 留在当前句，可修改重试
```

---

## 八、待完成事项

- [ ] 剑桥雅思 17-18 材料
- [ ] 雅思哥口语题库
- [ ] 王陆语料库第 3/4/5 章
- [ ] 刘洪波同义替换表
- [ ] 补全 Simon 范文剩余 ~24 篇
- [ ] Service Worker（离线缓存 / PWA）
- [ ] 移动端进一步适配

---

## 九、部署信息

- **GitHub 用户名**：yuan-y00
- **仓库**：ielts-dictation
- **Pages 分支**：master
- **Pages URL**：https://yuan-y00.github.io/ielts-dictation/

### 发布命令

```bash
cd "D:/Yuan/ielts/ielts-dictation"
git add -A
git commit -m "描述改动"
git push
# Pages 自动部署，约 10-30 秒生效
```

### 本地测试

```bash
cd "D:/Yuan/ielts/ielts-dictation"
python -m http.server 8765
# 浏览器打开 http://localhost:8765
```

---

## 十、设计决策记录

1. **字体选择**：从 Playfair Display + Crimson Pro + DM Sans → Georgia → 最终使用系统无衬线（Segoe UI / PingFang SC），因为屏幕阅读场景下无衬线体更省眼
2. **抄写框形态**：从四边带框 + 背景色 → 下划线极简样式，减少视觉噪音
3. **卡片 vs 行内**：从独立卡片 → essay 内句子行，保留整篇文章的完整性
4. **Task 类型区分**：不靠标签，靠中文翻译颜色（T2 navy / T1 sage）
5. **抄写后状态**：输入框完全消失而非 disabled 灰掉，干净整洁
6. **TTS 对比校验**：对标点空格进行规范化处理（`word,word` = `word, word`）
