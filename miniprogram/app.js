App({
  onLaunch() {
    const accountInfo = wx.getAccountInfoSync()
    const envVersion = accountInfo.miniProgram && accountInfo.miniProgram.envVersion

    if (envVersion !== 'develop') {
      wx.setEnableDebug({ enableDebug: false })
    }
  },

  globalData: {
    appName: '一卷一得'
  }
})
