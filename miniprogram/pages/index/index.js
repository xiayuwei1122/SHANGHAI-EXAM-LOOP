const { catalog } = require('../../data/index')
const { DEFAULT_EXAM_TYPE, examTypes } = require('../../data/exam-types')
const storage = require('../../utils/storage')
const {
  buildExamTypeOptions,
  buildYearOptions,
  filterPapers,
  getPaperDisplayTitle,
  getPaperExamType,
  getRecordScore,
  sortPapersByYearDesc
} = require('../../utils/paper-filter')

Page({
  data: {
    papers: [],
    examTypes: [],
    selectedExamType: DEFAULT_EXAM_TYPE,
    selectedExamTypeIndex: 1,
    selectedExamTypeLabel: '市考',
    years: [],
    selectedYear: 'all',
    selectedYearIndex: 0,
    selectedYearLabel: '全部年份',
    filterHint: '',
    emptyTitle: '',
    emptyText: '',
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
      return {
        ...paper,
        examType: getPaperExamType(paper),
        displayTitle: getPaperDisplayTitle(paper),
        attemptCount: records.length,
        bestScore: best
      }
    })
    const historyScores = history.map(getRecordScore).filter(score => score !== null)
    const best = historyScores.length ? Math.max(...historyScores) : null
    this.allPapers = papers
    this.examTypeOptions = buildExamTypeOptions(papers, examTypes)
    this.setData({
      attemptCount: history.length,
      bestScore: best == null ? '--' : `${best}`
    })
    this.applyFilters(this.data.selectedExamType, this.data.selectedYear)
  },

  applyFilters(selectedExamType, selectedYear) {
    const typePapers = filterPapers(this.allPapers || [], { examType: selectedExamType })
    const years = buildYearOptions(typePapers)
    const effectiveYear = years.some(item => item.value === String(selectedYear))
      ? String(selectedYear)
      : 'all'
    const papers = sortPapersByYearDesc(filterPapers(typePapers, { year: effectiveYear }))
    const selectedOption = this.examTypeOptions.find(item => item.value === selectedExamType)
      || this.examTypeOptions[0]
    const selectedExamTypeIndex = Math.max(0, this.examTypeOptions.findIndex(item => item.value === selectedOption.value))
    const selectedYearIndex = Math.max(0, years.findIndex(item => item.value === effectiveYear))
    const yearLabel = effectiveYear === 'all' ? '全部年份' : `${effectiveYear} 年`
    this.setData({
      papers,
      examTypes: this.examTypeOptions,
      selectedExamType: selectedOption.value,
      selectedExamTypeIndex,
      selectedExamTypeLabel: selectedOption.label,
      selectedYear: effectiveYear,
      selectedYearIndex,
      selectedYearLabel: yearLabel,
      years,
      filterHint: `${selectedOption.label} · ${yearLabel} · ${papers.length} 套`,
      emptyTitle: selectedOption.emptyTitle || '没有符合条件的试卷',
      emptyText: selectedOption.emptyText || '换一个考试类型或年份看看。'
    })
  },

  selectExamType(event) {
    const selected = this.examTypeOptions[Number(event.detail.value)]
    if (selected) this.applyFilters(selected.value, 'all')
  },

  selectYear(event) {
    const selected = this.data.years[Number(event.detail.value)]
    if (selected) this.applyFilters(this.data.selectedExamType, selected.value)
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
