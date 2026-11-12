const { catalog } = require('../../data/index')
const storage = require('../../utils/storage')
const { buildYearOptions, filterPapersByYear, getRecordScore } = require('../../utils/paper-filter')

Page({
  data: {
    papers: [],
    years: [],
    selectedYear: 'all',
    yearHint: '',
    totalPaperCount: catalog.length,
    selectedPaper: null,
    showModules: false,
    attemptCount: 0,
    bestScore: '--'
  },

  onShow() {
    const history = storage.getHistory()
    const papers = catalog.map(paper => {
      const records = history.filter(item => item.paperId === paper.id)
      const scores = records.map(getRecordScore).filter(score => score !== null)
      const best = scores.length ? Math.max(...scores) : null
      return { ...paper, attemptCount: records.length, bestScore: best }
    })
    const historyScores = history.map(getRecordScore).filter(score => score !== null)
    const best = historyScores.length ? Math.max(...historyScores) : null
    this.allPapers = papers
    const visiblePapers = filterPapersByYear(papers, this.data.selectedYear)
    this.setData({
      papers: visiblePapers,
      years: buildYearOptions(papers),
      yearHint: this.getYearHint(this.data.selectedYear, visiblePapers.length),
      attemptCount: history.length,
      bestScore: best == null ? '--' : `${best}`
    })
  },

  getYearHint(selectedYear, count) {
    return selectedYear === 'all' ? `全部年份 · ${count} 套` : `${selectedYear} 年 · ${count} 套`
  },

  selectYear(event) {
    const selectedYear = String(event.currentTarget.dataset.year)
    const papers = filterPapersByYear(this.allPapers || [], selectedYear)
    this.setData({ selectedYear, papers, yearHint: this.getYearHint(selectedYear, papers.length) })
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
