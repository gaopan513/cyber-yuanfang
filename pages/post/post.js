const api = require('../../services/choices')

/**
 * 内容安全检查（尽力而为）
 * wx.security.msgSecCheck 在部分基础库/环境不可用时放行，
 * 正式上线前建议在服务端强制校验。
 */
function secCheck(content) {
  return new Promise((resolve) => {
    if (!wx.security || !wx.security.msgSecCheck) return resolve(true)
    wx.security.msgSecCheck({
      content,
      success: (res) => resolve(!(res && res.err_code === 87014)),
      fail: () => resolve(true)
    })
  })
}

Page({
  data: {
    cats: api.CATEGORIES,
    durs: api.DURATIONS,
    minTitle: api.MIN_TITLE,
    minDetail: api.MIN_DETAIL,
    title: '',
    detail: '',
    planB: '',
    amountText: '',
    category: '',
    durationHours: 0,
    canSubmit: false,
    submitting: false,
    focusField: '',
    missingHint: ''
  },

  onFocus(e) {
    this.setData({ focusField: e.currentTarget.dataset.field })
  },

  onBlur(e) {
    if (this.data.focusField === e.currentTarget.dataset.field) {
      this.setData({ focusField: '' })
    }
  },

  /** 缺失项提示：按表单顺序指出第一个没完成的要求 */
  hintFor(t, d, c, h) {
    if (t.trim().length < api.MIN_TITLE) return '标题至少 ' + api.MIN_TITLE + ' 字'
    if (d.trim().length < api.MIN_DETAIL) return '纠结理由至少 ' + api.MIN_DETAIL + ' 字'
    if (!c) return '选一个分类'
    if (!h) return '选一个评判时长'
    return ''
  },

  onTitle(e) {
    this.setField('title', e.detail.value)
  },

  onDetail(e) {
    this.setField('detail', e.detail.value)
  },

  onPlanB(e) {
    this.setField('planB', e.detail.value)
  },

  onAmount(e) {
    // 金额选填，不参与 canSubmit；digit 键盘也可能给空串
    this.setData({ amountText: e.detail.value })
  },

  setField(key, val) {
    const patch = {}
    patch[key] = val
    // 注意：setData 前读 this.data 是旧值，必须用本次传入的 val 参与计算
    const t = key === 'title' ? val : this.data.title
    const d = key === 'detail' ? val : this.data.detail
    const c = key === 'category' ? val : this.data.category
    const h = key === 'durationHours' ? val : this.data.durationHours
    patch.canSubmit =
      t.trim().length >= api.MIN_TITLE && d.trim().length >= api.MIN_DETAIL && !!c && !!h
    patch.missingHint = this.hintFor(t, d, c, h)
    this.setData(patch)
  },

  pickCat(e) {
    this.setField('category', e.currentTarget.dataset.v)
  },

  pickDur(e) {
    this.setField('durationHours', Number(e.currentTarget.dataset.v))
  },

  /**
   * 用 Promise 链而不是 async/await：
   * 开发者工具增强编译的 @babel/runtime 助手注入在部分环境不可靠
   * （module '@babel/runtime/helpers/typeof.js' is not defined 导致页面空白），
   * 全项目避免 async/await 可彻底绕开该问题。
   */
  submit() {
    if (this.data.submitting) return
    if (!this.data.canSubmit) {
      // 精确指出第一个不达标的字段，别让用户猜
      const t = this.data.title.trim()
      const d = this.data.detail.trim()
      let msg = ''
      if (t.length < api.MIN_TITLE) {
        msg = '标题至少 ' + api.MIN_TITLE + ' 个字'
      } else if (d.length < api.MIN_DETAIL) {
        msg = '纠结理由至少 ' + api.MIN_DETAIL + ' 个字，现在 ' + d.length + ' 个'
      } else if (!this.data.category) {
        msg = '选一个分类'
      } else {
        msg = '选一个评判时长'
      }
      wx.showToast({ title: msg, icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    wx.showLoading({ title: '发布中…', mask: true })
    secCheck(this.data.title + ' ' + this.data.detail).then((safe) => {
      if (!safe) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showModal({
          title: '内容需要调整',
          content: '内容可能包含违规信息，换个说法再试试。',
          showCancel: false
        })
        return
      }
      api.publish({
        title: this.data.title,
        detail: this.data.detail,
        planB: this.data.planB,
        amount: this.data.amountText,
        category: this.data.category,
        durationHours: this.data.durationHours
      })
      wx.hideLoading()
      this.setData({ submitting: false, title: '', detail: '', planB: '', amountText: '', category: '', durationHours: 0, canSubmit: false, missingHint: '', focusField: '' })
      wx.showToast({ title: '已发布，等待路人评判', icon: 'none' })
      setTimeout(() => wx.switchTab({ url: '/pages/plaza/plaza' }), 600)
    }).catch((err) => {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: (err && err.message) || '发布失败，请重试', icon: 'none' })
    })
  }
})
