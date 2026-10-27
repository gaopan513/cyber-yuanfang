/**
 * 数据层冒烟测试（Node 环境，模拟 wx 存储）
 * 覆盖：种子加载 / 信息流筛选 / 投票与重复投票 / 自己投自己 / 发布 / 删除 / 举报 / 统计
 * 运行：node tools/smoke_test.js
 */
global.wx = {
  _s: {},
  getStorageSync(k) {
    return this._s[k] === undefined ? '' : this._s[k]
  },
  setStorageSync(k, v) {
    this._s[k] = v
  }
}

const assert = require('assert')
const store = require('../utils/store')
const api = require('../services/choices')
const fmt = require('../utils/format')

// 1. 初始化与种子
store.init()
const feed1 = api.feed('latest', 0, 10)
assert.strictEqual(feed1.total, 10, '应有 10 条种子数据')

// 2. 先投后看：未投票时 revealResults 应为 false
const openOne = feed1.list.find((c) => c.canVote)
assert.ok(openOne, '应存在可投票的选择')
assert.strictEqual(openOne.revealResults, false, '未投票时不得展示票数倾向')

// 3. 投票后可见结果
const voted = api.vote(openOne.id, 'approve')
assert.strictEqual(voted.myVote, 'approve')
assert.strictEqual(voted.revealResults, true, '投票后应展示结果')
assert.strictEqual(voted.approve_count, openOne.approve_count + 1, '通过票数 +1')

// 4. 重复投票被拒
let dupErr = null
try {
  api.vote(openOne.id, 'reject')
} catch (e) {
  dupErr = e
}
assert.ok(dupErr && dupErr.code === 'ALREADY_VOTED', '重复投票应报 ALREADY_VOTED')

// 5. 不能投自己的
const mine = api.publish({
  title: '要不要通宵把 demo 写完？',
  detail: '明早十点要给团队演示，现在只完成了一半，通宵还是明天早起赶？',
  planB: '先睡 4 小时，早起继续。',
  category: '职业',
  durationHours: 2
})
assert.strictEqual(mine.isMine, true, '新发布应为本人所有')
assert.strictEqual(mine.canVote, false, '自己不能投自己')
let ownErr = null
try {
  api.vote(mine.id, 'approve')
} catch (e) {
  ownErr = e
}
assert.ok(ownErr && ownErr.code === 'OWN_POST', '投自己应报 OWN_POST')

// 6. 校验拦截
let badErr = null
try {
  api.publish({ title: '啊', detail: '太短了', category: '别的', durationHours: 5 })
} catch (e) {
  badErr = e
}
assert.ok(badErr, '非法参数应被拦截')

// 7. 删除自己的发布
assert.strictEqual(api.remove(mine.id), true, '删除自己的应成功')
assert.strictEqual(api.detail(mine.id), null, '删除后查不到')

// 8. 举报去重 + 自动下架
const target = api.feed('latest', 0, 1).list[0]
assert.strictEqual(api.report(target.id, 'test'), true, '首次举报成功')
assert.strictEqual(api.report(target.id, 'again'), false, '同一用户重复举报返回 false')

// 9. 统计口径
const s = api.stats()
assert.strictEqual(s.votesCast, 1, '投出 1 票')
assert.strictEqual(s.helped, 1, '帮别人拍板 1 次')
assert.strictEqual(s.published, 0, '发布又删除后为 0')

// 10. 筛选器
const ending = api.feed('ending', 0, 20)
assert.ok(ending.list.every((c) => !c.ended), '即将揭晓只含未结束')
const ended = api.feed('ended', 0, 20)
assert.ok(ended.list.every((c) => c.ended), '已揭晓只含已结束')
assert.ok(ended.list.every((c) => c.verdict), '已揭晓都有结论')

// 11. 时间格式化（remaining 用 ceil：倒计时宁可多报不可少报）
assert.strictEqual(fmt.remaining(47 * 60e3), '47 分钟')
assert.strictEqual(fmt.remaining(125 * 60e3), '3 小时')
assert.strictEqual(fmt.remaining(3599e3), '1 小时')
assert.strictEqual(fmt.remaining(25 * 3600e3 + 30 * 60e3), '1 天 2 小时')
assert.strictEqual(fmt.remaining(-1), '已结束')

// 12. 金额与省钱（驳回=省下 / 通过=获批要花 / 平票不计）
assert.strictEqual(fmt.money(1299), '1,299', '金额千分位')
assert.strictEqual(fmt.money(99.5), '99.50', '小数金额两位')
const d7 = api.detail(7) // 1380 球鞋：已结束，通过
assert.ok(d7.hasAmount && d7.amountLabel === '1,380', '金额帖有金额标签')
assert.strictEqual(d7.willSpendYuan, 1380, '通过的金额帖算获批开销')
assert.strictEqual(d7.savedYuan, 0, '通过不算省钱')
const d8 = api.detail(8) // 6000 考研班：已结束，驳回
assert.strictEqual(d8.savedYuan, 6000, '驳回的金额帖算省下')
assert.strictEqual(d8.willSpendYuan, 0, '驳回不算开销')
const d10 = api.detail(10) // 无金额帖
assert.ok(!d10.hasAmount && d10.savedYuan === 0, '无金额帖不参与省钱')
const withAmount = api.publish({
  title: '测试金额入库',
  detail: '发布时填的金额要能原样读回来哦',
  category: '消费',
  durationHours: 2,
  amount: '1299'
})
assert.strictEqual(api.detail(withAmount.id).amount, 1299, '金额字符串入库转数字')
api.remove(withAmount.id)
assert.strictEqual(api.stats().savedTotal, 0, '本人无已揭晓金额帖时省下为 0')

console.log('SMOKE TEST ALL PASS ✔')
