const api = require('../../services/choices')

const PAGE_SIZE = 10
const FILTERS = [
  { key: 'latest', name: '最新' },
  { key: 'ending', name: '即将揭晓' },
  { key: 'ended', name: '已揭晓' }
]

Page({
  data: {
    filters: FILTERS,
    filter: 'latest',
    list: [],
    now: 0,
    loaded: false,
    hasMore: false,
    loading: false,
    stats: { published: 0, votesReceived: 0, helped: 0 },
    showTop: false
  },

  onLoad() {
    this.tickTimer = setInterval(() => {
      this.setData({ now: Date.now() })
    }, 30000)
  },

  onShow() {
    this.reload()
  },

  onHide() {
    this.stopTick()
  },

  onUnload() {
    this.stopTick()
  },

  stopTick() {
    if (this.tickTimer) {
      clearInterval(this.tickTimer)
      this.tickTimer = null
    }
  },

  fetchStats() {
    const s = api.stats()
    this.setData({
      stats: { published: s.published, votesReceived: s.votesReceived, helped: s.helped }
    })
  },

  reload() {
    this.fetchStats()
    const res = api.feed(this.data.filter, 0, PAGE_SIZE)
    this.setData({
      list: res.list,
      loaded: true,
      hasMore: res.list.length < res.total,
      now: Date.now()
    })
  },

  loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true })
    const res = api.feed(this.data.filter, this.data.list.length, PAGE_SIZE)
    const list = this.data.list.concat(res.list)
    this.setData({ list, hasMore: list.length < res.total, loading: false, now: Date.now() })
  },

  switchFilter(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.filter) return
    this.setData({ filter: key })
    this.reload()
  },

  onVote(e) {
    const { id, decision } = e.detail
    const idx = this.data.list.findIndex((c) => c.id === id)
    if (idx === -1) return
    try {
      const updated = api.vote(id, decision)
      const patch = {}
      patch['list[' + idx + ']'] = updated
      this.setData(patch)
      this.fetchStats()
      wx.vibrateShort({ type: 'light' })
      wx.showToast({ title: decision === 'approve' ? '已投「通过」' : '已投「驳回」', icon: 'none' })
    } catch (err) {
      if (err.code === 'ALREADY_VOTED') {
        wx.showToast({ title: '你已经表过态啦', icon: 'none' })
        this.reload()
      } else if (err.code === 'ENDED') {
        wx.showToast({ title: '这条评判刚结束啦', icon: 'none' })
        this.reload()
      } else {
        wx.showToast({ title: err.message || '投票失败，请重试', icon: 'none' })
      }
    }
  },

  onOpen(e) {
    wx.navigateTo({ url: '/pages/detail/detail?id=' + e.detail.id })
  },

  onMenu(e) {
    const choice = e.detail.choice
    if (!choice) return
    if (choice.isMine) {
      wx.showActionSheet({
        itemList: ['查看详情', '删除这条选择'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.navigateTo({ url: '/pages/detail/detail?id=' + choice.id })
          } else if (res.tapIndex === 1) {
            this.confirmDelete(choice)
          }
        }
      })
    } else {
      wx.showActionSheet({
        itemList: ['举报这条内容'],
        success: (res) => {
          if (res.tapIndex === 0) {
            api.report(choice.id, '')
            wx.showToast({ title: '已收到举报，感谢守护广场', icon: 'none' })
          }
        }
      })
    }
  },

  confirmDelete(choice) {
    wx.showModal({
      title: '删除这条选择？',
      content: '删除后无法恢复，相关投票也会一并清除。',
      confirmText: '删除',
      confirmColor: '#B04A41',
      success: (res) => {
        if (!res.confirm) return
        api.remove(choice.id)
        wx.showToast({ title: '已删除', icon: 'none' })
        this.reload()
      }
    })
  },

  lookAround() {
    try {
      wx.pageScrollTo({ selector: '.seg', duration: 200 })
    } catch (e) {
      wx.pageScrollTo({ scrollTop: 0, duration: 200 })
    }
  },

  goPost() {
    wx.switchTab({ url: '/pages/post/post' })
  },

  onPageScroll(e) {
    const show = e.scrollTop > 800
    if (show !== this.data.showTop) this.setData({ showTop: show })
  },

  backTop() {
    wx.pageScrollTo({ scrollTop: 0, duration: 200 })
  },

  onPullDownRefresh() {
    this.reload()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    this.loadMore()
  },

  onShareAppMessage() {
    return { title: '赛博元芳：来广场帮陌生人拍板', path: '/pages/plaza/plaza' }
  }
})
