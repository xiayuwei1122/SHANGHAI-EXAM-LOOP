const { catalog } = require('../../data/index')
const storage = require('../../utils/storage')

function duration(seconds) { return `${Math.floor(seconds / 60)}分${seconds % 60 ? `${seconds % 60}秒` : ''}` }

function draftSummary(paper, mode, module) {
  const moduleId = module?.id || ''
  const draft = storage.getDraft(paper.id, mode, moduleId)
  if (!draft) return null
  const total = module?.questionCount || paper.questionCount
  const answeredCount = Object.values(draft.answers || {}).filter(Boolean).length
  return {
    id: `${paper.id}:${mode}:${moduleId || 'all'}`,
    paperId: paper.id,
    paperTitle: paper.title,
    mode,
    moduleId,
    moduleName: module?.name || '整卷练习',
    answeredCount,
    total,
    updatedAt: draft.updatedAt || 0,
    dateText: draft.updatedAt ? new Date(draft.updatedAt).toLocaleString('zh-CN') : '已自动保存',
    actionText: mode === 'paper' ? '继续整卷' : '继续模块'
  }
}

function getDrafts() {
  const drafts = []
  catalog.forEach(paper => {
    const paperDraft = draftSummary(paper, 'paper')
    if (paperDraft) drafts.push(paperDraft)
    paper.modules.forEach(module => {
      const moduleDraft = draftSummary(paper, 'module', module)
      if (moduleDraft) drafts.push(moduleDraft)
    })
  })
  return drafts.sort((left, right) => right.updatedAt - left.updatedAt)
}

Page({
  data: { history: [], drafts: [] },

  loadPageData() {
    const history = storage.getHistory().map(item => ({
      ...item,
      dateText: new Date(item.submittedAt).toLocaleString('zh-CN'),
      durationText: duration(item.elapsedSeconds)
    }))
    this.setData({ history, drafts: getDrafts() })
  },

  onShow() { this.loadPageData() },

  continueDraft(event) {
    const draft = this.data.drafts.find(item => item.id === event.currentTarget.dataset.id)
    if (!draft) return
    const moduleQuery = draft.mode === 'module' ? `&moduleId=${draft.moduleId}` : ''
    wx.navigateTo({ url: `/packages/${draft.paperId}/exam/exam?mode=${draft.mode}${moduleQuery}` })
  },

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
        this.loadPageData()
        wx.showToast({ title: '已删除', icon: 'success' })
      }
    })
  },

  clearAllRecords() {
    wx.showModal({
      title: '清空已完成记录？',
      content: '已交卷记录、完成轮次和历史最好分将全部重置；未完成进度会保留。',
      confirmText: '全部清空',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        storage.clearHistory()
        this.loadPageData()
        wx.showToast({ title: '已全部清空', icon: 'success' })
      }
    })
  }
})
