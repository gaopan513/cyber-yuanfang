/**
 * 业务层：选择（纠结）的查询、发布、投票、举报与个人数据
 * 页面只依赖本模块，不直接触碰 utils/store
 */
const store = require('../utils/store')
const fmt = require('../utils/format')

const CATEGORIES = ['消费', '职业', '感情', '学业', '生活', '其他']
const DURATIONS = [
  { hours: 2, label: '2 小时' },
  { hours: 6, label: '6 小时' },
  { hours: 24, label: '24 小时' }
]
// 必填字段最小长度：页面提示与 publish 校验共用，避免两处 magic number 漂移
const MIN_TITLE = 2
const MIN_DETAIL = 5

function fail(code, msg) {
  const e = new Error(msg)
  e.code = code
  throw e
}

function pctOf(part, other) {
  const t = part + other
  return t === 0 ? 0 : Math.round((part / t) * 100)
}

/**
 * 给原始行补充视图字段：
 *  isMine / myVote / ended / totalVotes / canVote / revealResults
 *  approvePct / rejectPct / createdLabel / remainingLabel / endLabel
 *  progressPct / verdict
 * 核心机制「先投后看」：揭晓前（未投票且未结束）不展示票数倾向
 */
function decorate(row) {
  if (!row) return null
  const me = store.getProfile().userId
  const now = Date.now()
  const endMs = new Date(row.end_at).getTime()
  const startMs = new Date(row.created_at).getTime()
  const ended = endMs <= now
  const myVote = store.myVoteMap()[row.id] || ''
  const isMine = row.owner_id === me
  const a = row.approve_count || 0
  const r = row.reject_count || 0
  const total = a + r
  let verdict = ''
  if (ended) {
    if (total === 0) verdict = '无人评判，听自己的'
    else if (a > r) verdict = '通过，去做吧'
    else if (r > a) verdict = '驳回，再想想'
    else verdict = '平票，听自己的'
  }
  const durTotal = Math.max(endMs - startMs, 1)
  const amount = Number(row.amount) || 0
  const hasAmount = amount > 0
  const rejected = ended && r > a
  const approved = ended && a > r
  return Object.assign({}, row, {
    isMine,
    myVote,
    ended,
    totalVotes: total,
    canVote: !ended && !isMine && !myVote,
    revealResults: ended || !!myVote,
    approvePct: pctOf(a, r),
    rejectPct: pctOf(r, a),
    createdLabel: fmt.timeAgo(row.created_at),
    remainingLabel: ended ? '已结束' : fmt.remaining(endMs - now),
    endLabel: ended ? '' : fmt.remaining(endMs - now) + '后自动揭晓',
    progressPct: ended
      ? 100
      : Math.min(99, Math.max(1, Math.round(((now - startMs) / durTotal) * 100))),
    verdict,
    hasAmount,
    amountLabel: hasAmount ? fmt.money(amount) : '',
    rejected,
    approved,
    savedYuan: rejected && hasAmount ? amount : 0,
    willSpendYuan: approved && hasAmount ? amount : 0
  })
}

function feed(filter, offset, limit) {
  const res = store.listChoices({ filter, offset, limit })
  return { list: res.list.map(decorate), total: res.total }
}

function detail(id) {
  return decorate(store.getChoice(id))
}

function publish(payload) {
  const title = (payload.title || '').trim()
  const detail = (payload.detail || '').trim()
  const planB = (payload.planB || '').trim()
  if (title.length < MIN_TITLE || title.length > 40) fail('TITLE', '标题请在 2-40 字之间')
  if (detail.length < MIN_DETAIL || detail.length > 1000) fail('DETAIL', '纠结理由请在 5-1000 字之间')
  if (planB.length > 200) fail('PLANB', 'B 计划不能超过 200 字')
  if (CATEGORIES.indexOf(payload.category) === -1) fail('CATEGORY', '请选择一个分类')
  if (DURATIONS.map((d) => d.hours).indexOf(payload.durationHours) === -1) {
    fail('DURATION', '请选择评判时长')
  }
  return decorate(
    store.createChoice({
      title,
      detail,
      planB,
      amount: payload.amount,
      category: payload.category,
      durationHours: payload.durationHours
    })
  )
}

function vote(id, decision) {
  store.castVote(id, decision)
  return detail(id)
}

function remove(id) {
  return store.deleteChoice(id)
}

function report(id, reason) {
  return store.reportChoice(id, reason)
}

function myPosts() {
  return store.listMyChoices().map(decorate)
}

function myVotes() {
  return store.listMyVotes().map((v) => {
    const deco = decorate(v.choice)
    deco.myVoteAt = v.created_at
    return deco
  })
}

function stats() {
  return store.getStats()
}

function myPending() {
  const now = Date.now()
  return store
    .listMyChoices()
    .filter((r) => new Date(r.end_at).getTime() > now)
    .sort((a, b) => new Date(a.end_at) - new Date(b.end_at))
    .map(decorate)
}

module.exports = {
  CATEGORIES,
  DURATIONS,
  MIN_TITLE,
  MIN_DETAIL,
  decorate,
  feed,
  detail,
  publish,
  vote,
  remove,
  report,
  myPosts,
  myVotes,
  stats,
  myPending
}
