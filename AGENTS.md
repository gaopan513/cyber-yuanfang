# 赛博元芳

## 项目现状

原生微信小程序，使用 JavaScript、WXML、WXSS 和 JSON，无前端构建步骤，也无 `package.json`。当前为本地演示版：数据写入 `wx` 本地存储，首次运行生成 10 条种子选择；尚未接入后端、云数据库或真实多用户身份认证。不要把本地投票、举报和匿名身份描述成跨设备共享或服务端保证。

## 运行与检查

- 微信开发者工具导入项目根目录，编译预览；AppID 在 `project.config.json`，当前已有具体配置，使用自己的应用前先核对。
- 数据层冒烟检查：在项目根目录运行 `node tools/smoke_test.js`，使用内存模拟 `wx` 存储，不操作开发者工具中的真实数据。
- 修改某个 JavaScript 文件后，可用 `node --check path/to/file.js` 检查语法。界面、页面配置或交互变更还需在微信开发者工具中验证。
- 已提交 8 张 tabBar PNG，无需重新生成即可运行。仅修改图标时才需要 Python + Pillow，执行 `python gen_icons.py` 会重写对应图片。
- 仅修改文档或 `.gitignore` 时，核对路径、命令和忽略规则即可，无需重跑业务检查。

## 代码位置与职责

| 位置 | 职责 |
|---|---|
| `app.js`、`app.json`、`app.wxss` | 启动初始化、页面/tabBar 配置、全局样式变量 |
| `pages/{home,plaza,post,mine,detail}/` | 首页、广场、发布、个人记录和详情 |
| `services/choices.js` | 业务入口、发布校验、视图字段和业务常量 |
| `utils/store.js` | 本地存储、种子数据、发布/投票/举报/统计规则 |
| `utils/format.js`、`utils/quotes.js` | 时间/金额格式化、首页语录 |
| `components/{choice-card,empty-state}/` | 选择卡片和空状态组件 |
| `tools/smoke_test.js` | 无外部依赖的数据层冒烟脚本 |
| `design-preview.html`、`gen_icons.py` | 浏览器设计预览、图标生成工具 |

页面的业务读写统一走 `services/choices.js`；`app.js` 及首页/我的页当前也读取 `store.getProfile()`。持久化读写仍由 `utils/store.js` 负责，不要在页面中增加重复存储实现。沿用 CommonJS `require` / `module.exports` 和既有代码风格，不为小改动引入构建系统。

## 业务约定

- 标题长度 2–40 字、理由 5–1000 字、B 计划不超过 200 字；最小长度复用 `services/choices.js` 的 `MIN_TITLE`、`MIN_DETAIL`，页面提示与发布校验保持一致。
- 分类为消费、职业、感情、学业、生活、其他；评判时长仅 2、6、24 小时，复用现有常量。
- 先投后看：未结束且本人未投票时，不展示通过/驳回倾向；`decorate()` 统一计算 `canVote`、`revealResults`、`verdict` 等视图字段。
- 同一匿名身份不能重复投票、不能投自己，结束后不能再投票；删除只允许当前匿名身份拥有的内容。
- 同一匿名身份对同一选择只计一次举报；模型累计 3 个不同身份举报后隐藏该条选择。此机制目前仅作用于本地数据。
- 金额选填，由 `normAmount()` 归一；本人已揭晓的金额帖中，驳回多于通过计入省下金额，通过多于驳回计入获批开销；平票或无金额不计入。
- 保留 `syf_seeded_v1` / `syf_seeded_v2` 的迁移语义；新增字段优先兼容存量数据，不能通过清空本地存储来掩盖迁移问题。

## 界面与平台约定

- 复用 `app.wxss` 的样式变量：暖白背景、墨绿主色、砖红驳回色；业务页面不要另起一套配色。
- 自定义组件有样式隔离，组件专属样式与动画放在组件自身 WXSS；动画保留减少动态效果的适配。
- `app.json` 的页面路径、tabBar 及图标文件保持一致。改工程配置后如热重载未生效，重新编译或重开开发者工具项目验证。
- 发布页现有 `wx.security.msgSecCheck` 调用只是客户端尝试，接口不可用时会放行，不能描述为服务端内容审核已完成。接入真实多人业务时，应按所选后端方案补齐身份校验和内容审核。

## Git 提交与隐私

- 根目录 `.gitignore` 排除 `.workbuddy/`、`.codegraph/`、`project.private.config.json`、真实环境变量、依赖、Python 缓存和日志。禁止把工具记忆、登录昵称、个人路径、截图操作记录、令牌或用户存储导出复制到可提交文件中。
- `.env.example`、`.env.*.example` 可提交，但只放占位值。原生小程序当前不自动读取 `.env`；它不是前端保密机制。AppSecret、云服务私钥等凭证必须留在后端环境。
- `project.config.json` 中的 AppID 是应用标识，可以公开；文档使用占位说明，不复制实际值。若公开仓库要隐藏应用关联，另行使用占位 AppID，不能把整份必要工程配置一并忽略。
- `packOptions.ignore` 只控制微信小程序打包，Git 提交由 `.gitignore` 控制。README、AGENTS 等开发文档已按文件加入打包排除列表；新增开发辅助文件后同步核对打包清单，保留现有排除项，不忽略页面、组件和图标资源。
- 初始化 Git 仓库后，用 `git check-ignore -v` 核验敏感路径，提交前查看 `git status --short` 与 `git diff --cached --name-only`；不要用强制加入文件绕过隐私规则。

项目使用方法与当前功能见 [README.md](README.md)。
