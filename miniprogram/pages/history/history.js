const storage = require('../../utils/storage')

function duration(seconds) { return `${Math.floor(seconds / 60)}分${seconds % 60 ? `${seconds % 60}秒` : ''}` }

Page({
  data: { history: [] },

  loadHistory() {
    const history = storage.getHistory().map(item => ({
      ...item,
      dateText: new Date(item.submittedAt).toLocaleString('zh-CN'),
      durationText: duration(item.elapsedSeconds)
    }))
    this.setData({ history })
  },

  onShow() { this.loadHistory() },

  openRecord(event) {
    const record = this.data.history.find(item => item.id === event.currentTarget.dataset.id)
    if (record) wx.navigateTo({ url: `/packages/${record.paperId}/result/result?recordId=${record.id}` })
  },

  deleteRecord(event) {
    const id = event.currentTarget.dataset.id
    const record = this.data.history.find(item => item.id === id)
    if (!record) return
    wx.showModal({
      title: '删除这条记录？',
      content: `${record.paperTitle} · ${record.moduleName}`,
      confirmText: '删除',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        storage.removeRecord(id)
        this.loadHistory()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  clearAllRecords() {
    wx.showModal({
      title: '清空全部记录？',
      content: '练习记录、完成轮次和历史最好将全部重置，且无法恢复。',
      confirmText: '全部清空',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        storage.clearHistory()
        this.loadHistory()
        wx.showToast({ title: '已全部清空', icon: 'success' })
      }
    })
  }
})
