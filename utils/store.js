/**
 * 本地数据层（演示版）
 *
 * 说明：当前版本数据保存在手机本地存储中，仅在设备内可见。
 * 所有 API 的入参与返回值都按云端形态设计（行结构、错误码、统计口径），
 * 之后接入 WorkBuddy 云服务时，只需替换本文件实现并初始化云端客户端，
 * services/ 与页面层无需任何改动。
 *
 * 行结构：
 *   choice: { id, owner_id, title, detail, plan_b, category, amount, duration_hours,
 *             end_at, created_at, approve_count, reject_count, is_hidden }
 *   vote:   { id, choice_id, owner_id, decision('approve'|'reject'), created_at }
 *
 * 错误码：BAD_DECISION / NOT_FOUND / OWN_POST / ENDED / ALREADY_VOTED
 */
const KEYS = {
  profile: 'syf_profile',
  choices: 'syf_choices',
  votes: 'syf_votes',
  reports: 'syf_reports',
  seeded: 'syf_seeded_v1',
  seededV2: 'syf_seeded_v2'
}

const HOUR = 3600e3
const MIN = 60e3

function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    return v === '' || v === null || v === undefined ? fallback : v
  } catch (e) {
    return fallback
  }
}

function write(key, val) {
  try {
    wx.setStorageSync(key, val)
  } catch (e) {
    // 存储异常时静默，业务层会以内存默认值兜底
  }
}

function rid() {
  return 'u' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)
}

function fail(code, msg) {
  const e = new Error(msg)
  e.code = code
  throw e
}

/**
 * 金额归一：非法/负数 → 0；最多两位小数；上限 999 万
 */
function normAmount(v) {
  const n = Number(v)
  if (!isFinite(n) || n <= 0) return 0
  return Math.min(Math.round(n * 100) / 100, 9999999)
}

/* ---------------- 匿名身份 ---------------- */

function getProfile() {
  let p = read(KEYS.profile, null)
  if (!p || !p.userId) {
    p = {
      userId: rid(),
      nickname: '纠结者' + String(Math.floor(100000 + Math.random() * 900000)),
      createdAt: new Date().toISOString()
    }
    write(KEYS.profile, p)
  }
  return p
}

/* ---------------- 种子数据 ---------------- */

function buildSeeds() {
  const now = Date.now()
  const mk = (o) => {
    const endMs = now + o.endsInMin * MIN
    return {
      id: o.id,
      owner_id: 'seed_' + o.id,
      title: o.title,
      detail: o.detail,
      plan_b: o.planB || '',
      category: o.category,
      amount: o.amount || 0,
      duration_hours: o.dur,
      end_at: new Date(endMs).toISOString(),
      created_at: new Date(endMs - o.dur * HOUR).toISOString(),
      approve_count: o.a,
      reject_count: o.r,
      is_hidden: false
    }
  }
  return [
    mk({
      id: 1, category: '消费', amount: 1299, dur: 2, endsInMin: 47, a: 12, r: 5,
      title: '要不要花 1299 换掉用了三年的旧手机？',
      detail:
        '现在这台电池健康 78%，一天要充两次电，但微信、扫码、拍照其实都还够用。换新机主要是想尝鲜新系统，又觉得这钱花得有点心虚。',
      planB: '再战一年，等下一代发布后买上代，能省小两千。'
    }),
    mk({
      id: 2, category: '消费', amount: 299, dur: 2, endsInMin: 98, a: 4, r: 7,
      title: '299 的人体工学椅坐得挺好，要不要加钱换千元档？',
      detail:
        '门店试坐了千元档，腰部支撑确实更好，但价差 700 块。我每天在家办公 6 小时以上，椅子到底算不算生产工具？',
      planB: '给现在这把加个靠垫凑合。'
    }),
    mk({
      id: 3, category: '消费', amount: 399, dur: 2, endsInMin: 110, a: 9, r: 11,
      title: '399 元的年度健身卡，要不要办？',
      detail:
        '去年办过一张，总共去了 8 次，折合一节课 50 块。今年信心满满想练起来，但怕历史重演。',
      planB: '先按次买体验课，连续去满 6 次再办卡。'
    }),
    mk({
      id: 4, category: '职业', dur: 6, endsInMin: 125, a: 7, r: 3,
      title: '该不该主动申请调去新项目组？',
      detail:
        '新项目是公司明年的重点，领导上周隐约提过一句。可去了就要换工位、重新证明自己，现在的组稳定又舒服，有点舍不得。',
      planB: '留在原组，把手上的项目做出结果再谈。'
    }),
    mk({
      id: 5, category: '生活', dur: 6, endsInMin: 310, a: 18, r: 6,
      title: '周日凌晨的半程马拉松，还跑不跑？',
      detail:
        '报名费早就交了，最近一周天天加班到十一点，总共只练了两次。目标不是成绩，是完赛，但膝盖上周有点隐隐作痛。',
      planB: '弃赛，改报下个月的 10 公里。'
    }),
    mk({
      id: 6, category: '感情', dur: 24, endsInMin: 1320, a: 14, r: 4,
      title: '要不要在好兄弟的婚礼上讲那段准备的祝词？',
      detail:
        '新郎是我大学室友，点名要我上台讲两句。但我一上台就忘词，可以预见大型社死现场。不讲又怕他遗憾。',
      planB: '提前写好逐字稿，到时候照着念也要念完。'
    }),
    mk({
      id: 7, category: '消费', amount: 1380, dur: 24, endsInMin: -180, a: 25, r: 8,
      title: '1380 的大牌球鞋，冲不冲？',
      detail:
        '周末逛街一眼相中，尺码刚好剩最后一双。日常穿鞋就两三双轮换，这双的价格是我一个月的饭钱预算。',
      planB: '拍照存进心愿单，双十一再看一眼还爱不爱。'
    }),
    mk({
      id: 8, category: '学业', amount: 6000, dur: 6, endsInMin: -300, a: 6, r: 19,
      title: '要不要花 6000 报考研辅导班？',
      detail:
        '自制力一般，室友报了班每天 6 点起床学习，我被卷得心慌。但辅导班的内容网上都能搜到类似的。',
      planB: '找研友互相监督，白嫖公开课。'
    }),
    mk({
      id: 9, category: '职业', dur: 2, endsInMin: -1560, a: 11, r: 9,
      title: '该不该跟领导提加薪 20%？',
      detail:
        '入职两年没涨过薪，最近独立扛下了两个项目。担心提了被拒尴尬，更担心不提一直憋着。',
      planB: '先约一次正式的 1v1，把成果摆出来再说。'
    }),
    mk({
      id: 10, category: '生活', dur: 2, endsInMin: -49, a: 9, r: 9,
      title: '要不要养第二只猫？',
      detail:
        '家里的猫今年三岁，性格粘人。看它每天独自在家有点心疼，但也担心两只合不来，天天打架。',
      planB: '先接朋友家的猫来寄养一周，观察合不合得来。'
    })
  ]
}

function init() {
  if (read(KEYS.seeded, false)) {
    // v1 → v2 迁移：为存量行补 amount（老演示数据也能显示省钱）
    if (!read(KEYS.seededV2, false)) {
      const amt = {}
      buildSeeds().forEach((s) => {
        if (s.amount) amt[s.id] = s.amount
      })
      saveAll(
        listAll().map((r) => (amt[r.id] && !r.amount ? Object.assign({}, r, { amount: amt[r.id] }) : r))
      )
      write(KEYS.seededV2, true)
    }
    return
  }
  write(KEYS.choices, buildSeeds())
  write(KEYS.votes, [])
  write(KEYS.reports, [])
  write(KEYS.seeded, true)
  write(KEYS.seededV2, true)
}

/* ---------------- 选择 CRUD ---------------- */

function listAll() {
  return read(KEYS.choices, [])
}

function saveAll(list) {
  write(KEYS.choices, list)
}

function listChoices(opts) {
  const o = opts || {}
  const filter = o.filter || 'latest'
  const offset = o.offset || 0
  const limit = o.limit || 10
  const now = Date.now()
  let rows = listAll().filter((r) => !r.is_hidden)
  if (filter === 'ending') {
    rows = rows
      .filter((r) => new Date(r.end_at).getTime() > now)
      .sort((a, b) => new Date(a.end_at) - new Date(b.end_at))
  } else if (filter === 'ended') {
    rows = rows
      .filter((r) => new Date(r.end_at).getTime() <= now)
      .sort((a, b) => new Date(b.end_at) - new Date(a.end_at))
  } else {
    rows = rows.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }
  return { list: rows.slice(offset, offset + limit), total: rows.length }
}

function getChoice(id) {
  const nid = Number(id)
  return listAll().find((r) => r.id === nid) || null
}

function createChoice(payload) {
  const list = listAll()
  const me = getProfile().userId
  const now = Date.now()
  const hours = payload.durationHours || 2
  const nextId = list.reduce((m, r) => Math.max(m, r.id), 0) + 1
  const row = {
    id: nextId,
    owner_id: me,
    title: payload.title,
    detail: payload.detail,
    plan_b: payload.planB || '',
    category: payload.category || '其他',
    amount: normAmount(payload.amount),
    duration_hours: hours,
    end_at: new Date(now + hours * HOUR).toISOString(),
    created_at: new Date(now).toISOString(),
    approve_count: 0,
    reject_count: 0,
    is_hidden: false
  }
  list.push(row)
  saveAll(list)
  return row
}

function deleteChoice(id) {
  const nid = Number(id)
  const me = getProfile().userId
  const list = listAll()
  const idx = list.findIndex((r) => r.id === nid)
  if (idx === -1 || list[idx].owner_id !== me) return false
  list.splice(idx, 1)
  saveAll(list)
  write(
    KEYS.votes,
    read(KEYS.votes, []).filter((v) => v.choice_id !== nid)
  )
  return true
}

/* ---------------- 投票 / 举报 ---------------- */

function castVote(choiceId, decision) {
  const nid = Number(choiceId)
  if (decision !== 'approve' && decision !== 'reject') fail('BAD_DECISION', '参数错误')
  const me = getProfile().userId
  const list = listAll()
  const ch = list.find((r) => r.id === nid)
  if (!ch || ch.is_hidden) fail('NOT_FOUND', '这条选择不存在或已下架')
  if (ch.owner_id === me) fail('OWN_POST', '不能给自己的选择投票哦')
  if (new Date(ch.end_at).getTime() <= Date.now()) fail('ENDED', '评判已经结束，下次早点来')
  const votes = read(KEYS.votes, [])
  if (votes.some((v) => v.choice_id === nid && v.owner_id === me)) {
    fail('ALREADY_VOTED', '你已经表过态啦')
  }
  votes.push({
    id: votes.length + 1,
    choice_id: nid,
    owner_id: me,
    decision,
    created_at: new Date().toISOString()
  })
  if (decision === 'approve') ch.approve_count += 1
  else ch.reject_count += 1
  write(KEYS.votes, votes)
  saveAll(list)
  return { approve_count: ch.approve_count, reject_count: ch.reject_count }
}

function myVoteMap() {
  const me = getProfile().userId
  const map = {}
  read(KEYS.votes, []).forEach((v) => {
    if (v.owner_id === me) map[v.choice_id] = v.decision
  })
  return map
}

function reportChoice(choiceId, reason) {
  const nid = Number(choiceId)
  const me = getProfile().userId
  const reports = read(KEYS.reports, [])
  if (reports.some((v) => v.choice_id === nid && v.owner_id === me)) return false
  reports.push({
    id: reports.length + 1,
    choice_id: nid,
    owner_id: me,
    reason: reason || '',
    created_at: new Date().toISOString()
  })
  write(KEYS.reports, reports)
  // 举报满 3 人自动下架
  const n = reports.filter((v) => v.choice_id === nid).length
  if (n >= 3) {
    const list = listAll()
    const ch = list.find((r) => r.id === nid)
    if (ch) {
      ch.is_hidden = true
      saveAll(list)
    }
  }
  return true
}

/* ---------------- 个人数据 ---------------- */

function listMyChoices() {
  const me = getProfile().userId
  return listAll()
    .filter((r) => r.owner_id === me)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

function listMyVotes() {
  const me = getProfile().userId
  return read(KEYS.votes, [])
    .filter((v) => v.owner_id === me)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((v) => {
      const ch = getChoice(v.choice_id)
      return ch ? Object.assign({}, v, { choice: ch }) : null
    })
    .filter(Boolean)
}

function getStats() {
  const me = getProfile().userId
  const now = Date.now()
  const mine = listAll().filter((r) => r.owner_id === me)
  const ended = mine.filter((r) => new Date(r.end_at).getTime() <= now)
  const approved = ended.filter((r) => r.approve_count > r.reject_count).length
  const rejected = ended.filter((r) => r.reject_count > r.approve_count).length
  const pending = mine.filter((r) => new Date(r.end_at).getTime() > now)
  const votesReceived = mine.reduce((s, r) => s + r.approve_count + r.reject_count, 0)
  const myVotes = read(KEYS.votes, []).filter((v) => v.owner_id === me)
  const helped = myVotes.filter((v) => {
    const ch = getChoice(v.choice_id)
    return ch && ch.owner_id !== me
  }).length
  // 省钱口径：我的已揭晓金额帖，驳回=省下，通过=获批要花（平票不计）
  const moneyEnded = ended.filter((r) => Number(r.amount) > 0)
  const savedRows = moneyEnded.filter((r) => r.reject_count > r.approve_count)
  const approvedRows = moneyEnded.filter((r) => r.approve_count > r.reject_count)
  return {
    published: mine.length,
    pending: pending.length,
    approved,
    rejected,
    votesReceived,
    votesCast: myVotes.length,
    helped,
    savedTotal: savedRows.reduce((sum, r) => sum + Number(r.amount), 0),
    savedCount: savedRows.length,
    approvedSpendTotal: approvedRows.reduce((sum, r) => sum + Number(r.amount), 0)
  }
}

module.exports = {
  init,
  getProfile,
  listChoices,
  getChoice,
  createChoice,
  deleteChoice,
  castVote,
  myVoteMap,
  reportChoice,
  listMyChoices,
  listMyVotes,
  getStats
}
