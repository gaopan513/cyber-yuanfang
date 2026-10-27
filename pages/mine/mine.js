const api = require('../../services/choices')
const store = require('../../utils/store')
const fmt = require('../../utils/format')

Page({
  data: {
    profile: { nickname: '' },
    days: 1,
    stats: { published: 0, votesReceived: 0, helped: 0 },
    tab: 'mine',
    posts: [],
    votes: [],
    now: 0,
    loaded: false
  },

  onLoad() {
    this.tickTimer = setInterval(() => {
      this.setData({ now: Date.now() })
    }, 30000)
  },

  onShow() {
    this.refresh()
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

  refresh() {
    const profile = store.getProfile()
    const created = new Date(profile.createdAt).getTime()
    const days = Math.max(1, Math.floor((Date.now() - created) / 86400e3) + 1)
    const stats = api.stats()
    this.setData({
      profile,
      days,
      stats,
      savedLabel: fmt.money(stats.savedTotal),
      approvedLabel: fmt.money(stats.approvedSpendTotal),
      posts: api.myPosts(),
      votes: api.myVotes(),
      now: Date.now(),
      loaded: true
    })
  },

  switchTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab })
  },

  onVote(e) {
    try {
      api.vote(e.detail.id, e.detail.decision)
      wx.vibrateShort({ type: 'light' })
      wx.showToast({ title: e.detail.decision === 'approve' ? '已投「通过」' : '已投「驳回」', icon: 'none' })
      this.refresh()
    } catch (err) {
      wx.showToast({ title: err.message || '投票失败，请重试', icon: 'none' })
      this.refresh()
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
        this.refresh()
      }
    })
  },

  goPlaza() {
    wx.switchTab({ url: '/pages/plaza/plaza' })
  },

  goPost() {
    wx.switchTab({ url: '/pages/post/post' })
  },

  showPrivacy() {
    wx.showModal({
      title: '隐私保护指引',
      content: '赛博元芳不需要你提供任何个人信息。所有选择均匿名发布，仅展示为「一位陌生人」；你的投票记录只用于展示你自己的历史，不会透露给他人。删除选择会同时清除相关数据。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  showAbout() {
    wx.showModal({
      title: '关于赛博元芳',
      content: '把纠结的事交给认真而不相识的路人。先投后看，保持独立判断。当前为演示版本，数据保存在本机。',
      showCancel: false,
      confirmText: '好的'
    })
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  }
})
