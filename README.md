# TXT 小说阅读器

一个运行在 Android 手机上的简洁 txt 小说阅读器。纯前端 Web 技术开发，通过 Capacitor 打包为 APK，也可以直接在浏览器中使用。

---

## 功能

- **导入 txt 文件** — 从本地选择任意 txt 文件导入
- **自动提取章节** — 识别「第X章」「Chapter N」「1、2、」等格式，无法识别时按每 2000 字分页
- **书架管理** — 支持多本书，显示章节数、阅读进度和上次阅读时间，长按删除
- **阅读进度** — 进度条 + 百分比，退出时自动保存章节位置和滚动位置
- **累计阅读时长** — 实时计时，显示为「23分钟」/「1小时15分钟」，切到后台自动暂停
- **目录（TOC）** — 左侧抽屉展示全部章节，点击跳转
- **书签** — 随时为当前章节添加书签，在设置面板中管理和跳转
- **字体大小调节** — 滑块调节 14-28px，实时预览，跨会话保存
- **纸张主题** — 固定米白底（#f5f0e8）+ 深棕字（#3a2e1e），适合长时间阅读
- **手势翻章** — 左滑下一章，右滑上一章

---

## 技术栈

| 层 | 技术 |
|---|---|
| 构建 | Vite + TypeScript |
| 运行时 | Vanilla TypeScript（无框架） |
| 持久化 | IndexedDB（书籍内容、进度、书签）|
| 偏好设置 | @capacitor/preferences（字体大小）|
| Android 打包 | Capacitor 8 |
| 测试 | Vitest + jsdom + fake-indexeddb |

---

## 项目结构

```
src/
├── types.ts              # 共享类型：Book、Chapter、Bookmark、Prefs
├── main.ts               # 入口，路由注册
├── router.ts             # 简单 hash 路由
├── core/
│   ├── parser.ts         # txt 解析 → Chapter[]
│   ├── storage.ts        # IndexedDB CRUD
│   ├── timer.ts          # 阅读计时器
│   └── prefs.ts          # 字体大小持久化
├── pages/
│   ├── shelf.ts          # 书架页
│   └── reader.ts         # 阅读页
├── components/
│   ├── toc.ts            # 目录抽屉
│   └── settings.ts       # 设置面板（字体 + 书签）
└── styles/
    └── main.css          # 全局样式，纸张主题
```

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器（浏览器可直接使用）
npm run dev
# 打开 http://localhost:5173

# 运行单元测试
npm test

# 构建生产包
npm run build
```

> 在浏览器中使用时，点击 ＋ 按钮导入 txt 文件即可体验完整功能（无需 Android 设备）。

---

## 打包 Android APK

前提：已安装 [Android Studio](https://developer.android.com/studio) 和 JDK 17+。

```bash
# 1. 构建 Web 资源并同步到 Android 项目
npm run cap:build
# 等同于：npm run build && npx cap sync android

# 2. 用 Android Studio 打开
npx cap open android
```

在 Android Studio 中：
- **调试安装到手机**：连接 Android 手机（开启 USB 调试），点击 Run ▶
- **生成 APK**：Build → Generate Signed Bundle / APK → APK → 按向导操作

或者命令行直接安装到已连接的设备：

```bash
npx cap run android
```

---

## 使用效果

### 书架页

打开 App 后进入书架。首次使用时显示空状态提示。点击右上角 **＋** 选择 txt 文件，导入后出现书籍卡片，显示书名、章节数、阅读进度和上次阅读时间。长按卡片可删除书籍（进度和书签一并删除）。

### 阅读页

点击书籍卡片进入阅读页：

- 顶部栏显示当前章节标题，右上角有目录（☰）、书签（🔖）、设置（⚙）三个按钮
- 底部栏显示进度条 + 百分比和累计阅读时长
- **点击正文区域**：顶部栏和底部栏切换显示/隐藏，进入沉浸式阅读
- **左滑**：跳到下一章；**右滑**：跳到上一章
- 点击 **☰**：从左侧滑入目录抽屉，点击章节名跳转
- 点击 **🔖**：为当前章节添加书签，按钮短暂显示 ✓ 确认
- 点击 **⚙**：从底部弹出设置面板，可拖动滑块调整字体大小（实时预览），查看和管理书签
- 点击 **←** 返回书架，自动保存进度和阅读时长
