const { catalog } = require('../../data/index')
const storage = require('../../utils/storage')

Page({
  data: {
    papers: [],
    selectedPaper: null,
    showModules: false,
    attemptCount: 0,
    bestScore: '--'
  },

  onShow() {
    const history = storage.getHistory()
    const papers = catalog.map(paper => {
      const records = history.filter(item => item.paperId === paper.id)
      const best = records.length ? Math.max(...records.map(item => item.trainingScore)) : null
      return { ...paper, attemptCount: records.length, bestScore: best }
    })
    const best = history.length ? Math.max(...history.map(item => item.trainingScore)) : null
    this.setData({ papers, attemptCount: history.length, bestScore: best == null ? '--' : `${best}` })
  },

  startPaper(event) {
    const paperId = event.currentTarget.dataset.paper
    wx.navigateTo({ url: `/packages/${paperId}/exam/exam?mode=paper` })
  },

  chooseModule(event) {
    const paper = catalog.find(item => item.id === event.currentTarget.dataset.paper)
    this.setData({ selectedPaper: paper, showModules: true })
  },

  closeModules() { this.setData({ showModules: false }) },

  startModule(event) {
    const paperId = this.data.selectedPaper.id
    const moduleId = event.currentTarget.dataset.module
    this.setData({ showModules: false })
    wx.navigateTo({ url: `/packages/${paperId}/exam/exam?mode=module&moduleId=${moduleId}` })
  },

  openHistory() { wx.navigateTo({ url: '/pages/history/history' }) },

  stopBubble() {}
})
