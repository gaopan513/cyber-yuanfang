const api = require('../../services/choices')
const store = require('../../utils/store')
const quotes = require('../../utils/quotes')

function greetingByHour(h) {
  if (h >= 5 && h < 11) return '早上好'
  if (h >= 11 && h < 13) return '中午好'
  if (h >= 13 && h < 18) return '下午好'
  return '晚上好'
}

Page({
  data: {
    greeting: '',
    nickname: '',
    stats: {
      published: 0,
      approved: 0,
      rejected: 0,
      votesReceived: 0,
      votesCast: 0,
      helped: 0,
      pending: 0
    },
    adoptRate: 0,
    pendingCount: 0,
    pendingFirst: '',
    quote: ''
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const profile = store.getProfile()
    const stats = api.stats()
    const created = new Date(profile.createdAt).getTime()
    const days = Math.max(1, Math.floor((Date.now() - created) / 86400e3) + 1)
    const pending = api.myPending()
    const endedTotal = stats.approved + stats.rejected
    const dayIdx = Math.floor(Date.now() / 86400e3)
    this.setData({
      greeting: greetingByHour(new Date().getHours()),
      nickname: profile.nickname,
      stats,
      adoptRate: endedTotal ? Math.round((stats.approved / endedTotal) * 100) : 0,
      pendingCount: pending.length,
      pendingFirst: pending.length ? pending[0].remainingLabel : '',
      quote: quotes[dayIdx % quotes.length]
    })
  },

  goPost() {
    wx.switchTab({ url: '/pages/post/post' })
  },

  goMine() {
    wx.switchTab({ url: '/pages/mine/mine' })
  },

  goPlaza() {
    wx.switchTab({ url: '/pages/plaza/plaza' })
  },

  onShareAppMessage() {
    return { title: '赛博元芳：纠结的事，让路人帮你拍板', path: '/pages/home/home' }
  }
})
