const store = require('./utils/store')

App({
  globalData: {
    profile: null
  },

  onLaunch() {
    try {
      store.init()
      this.globalData.profile = store.getProfile()
    } catch (e) {
      console.error('[app] init failed', e && e.message)
    }
  }
})
