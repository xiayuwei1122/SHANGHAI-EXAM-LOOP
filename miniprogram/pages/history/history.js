const storage = require('../../utils/storage')

function duration(seconds) { return `${Math.floor(seconds / 60)}分${seconds % 60 ? `${seconds % 60}秒` : ''}` }

Page({
  data: { history: [] },
  onShow() {
    const history = storage.getHistory().map(item => ({
      ...item,
      dateText: new Date(item.submittedAt).toLocaleString('zh-CN'),
      durationText: duration(item.elapsedSeconds)
    }))
    this.setData({ history })
  },
  openRecord(event) {
    const record = this.data.history.find(item => item.id === event.currentTarget.dataset.id)
    if (record) wx.navigateTo({ url: `/packages/${record.paperId}/result/result?recordId=${record.id}` })
  }
})
