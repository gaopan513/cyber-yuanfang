const api = require('../../services/choices')
const fmt = require('../../utils/format')

Page({
  data: {
    choice: null,
    loaded: false,
    now: 0,
    createdFull: '',
    endFull: ''
  },

  onLoad(options) {
    this.id = options.id
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
    const choice = api.detail(this.id)
    this.setData({
      choice,
      loaded: true,
      now: Date.now(),
      createdFull: choice ? fmt.fullTime(choice.created_at) : '',
      endFull: choice ? fmt.fullTime(choice.end_at) : ''
    })
  },

  onVote(e) {
    try {
      const updated = api.vote(e.detail.id, e.detail.decision)
      this.setData({ choice: updated, now: Date.now() })
      wx.vibrateShort({ type: 'light' })
      wx.showToast({
        title: e.detail.decision === 'approve' ? '已投「通过」' : '已投「驳回」',
        icon: 'none'
      })
    } catch (err) {
      if (err.code === 'ALREADY_VOTED') {
        wx.showToast({ title: '你已经表过态啦', icon: 'none' })
        this.refresh()
      } else if (err.code === 'ENDED') {
        wx.showToast({ title: '这条评判刚结束啦', icon: 'none' })
        this.refresh()
      } else {
        wx.showToast({ title: err.message || '投票失败，请重试', icon: 'none' })
      }
    }
  },

  onMenu(e) {
    const choice = e.detail.choice
    if (!choice) return
    if (choice.isMine) {
      wx.showActionSheet({
        itemList: ['删除这条选择'],
        success: (res) => {
          if (res.tapIndex === 0) this.confirmDelete(choice)
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
        setTimeout(() => wx.navigateBack(), 500)
      }
    })
  },

  onShareAppMessage() {
    const c = this.data.choice
    if (!c) return { title: '赛博元芳：纠结的事，让路人帮你拍板', path: '/pages/home/home' }
    return {
      title: '帮 TA 拍个板：' + c.title,
      path: '/pages/detail/detail?id=' + c.id
    }
  }
})
