const fmt = require('../../utils/format')

Component({
  properties: {
    choice: { type: Object, value: null },
    now: { type: Number, value: 0 }
  },

  data: {
    remain: '已结束',
    endLabel: '',
    progress: 100,
    liveEnded: true,
    urgent: false
  },

  observers: {
    'choice, now': function (ch) {
      if (!ch || !ch.id) return
      const nowTs = this.data.now > 0 ? this.data.now : Date.now()
      const endMs = new Date(ch.end_at).getTime()
      const startMs = new Date(ch.created_at).getTime()
      const ended = endMs <= nowTs
      let remain = '已结束'
      let endLabel = ''
      let progress = 100
      let urgent = false
      if (!ended) {
        remain = fmt.remaining(endMs - nowTs)
        endLabel = remain + '后自动揭晓'
        progress = Math.min(
          99,
          Math.max(1, Math.round(((nowTs - startMs) / Math.max(endMs - startMs, 1)) * 100))
        )
        // 剩余不足 2 小时视为紧迫，倒计时红色脉冲提醒
        urgent = endMs - nowTs < 2 * 3600e3
      }
      this.setData({ remain, endLabel, progress, liveEnded: ended, urgent })
    }
  },

  methods: {
    fireVote(decision) {
      this.triggerEvent('vote', { id: this.data.choice.id, decision })
    },
    onApprove() {
      this.fireVote('approve')
    },
    onReject() {
      this.fireVote('reject')
    },
    onOpen() {
      this.triggerEvent('open', { id: this.data.choice.id })
    },
    onMenu() {
      this.triggerEvent('menu', { choice: this.data.choice })
    }
  }
})
