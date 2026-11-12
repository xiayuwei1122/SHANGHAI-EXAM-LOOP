const { getPaper } = require('../../data/index')
const storage = require('../../utils/storage')

function formatDuration(seconds) {
  const minute = Math.floor(seconds / 60)
  const second = seconds % 60
  return `${minute}分${second ? `${second}秒` : ''}`
}

Page({
  data: {
    record: null,
    result: null,
    filters: [
      { id: 'all', name: '全部' },
      { id: 'wrong', name: '错题' },
      { id: 'guessed', name: '蒙题' },
      { id: 'blank', name: '未答' }
    ],
    activeFilter: 'wrong',
    reviewItems: [],
    durationText: '',
    expanded: {}
  },

  onLoad(options) {
    this.record = storage.getRecord(options.recordId)
    if (!this.record) { wx.showToast({ title: '记录不存在', icon: 'none' }); return }
    this.paper = getPaper(this.record.paperId)
    this.questionMap = Object.create(null)
    this.paper.questions.forEach(question => { this.questionMap[question.id] = question })
    const initial = this.record.result.wrong || this.record.result.blank ? 'wrong' : 'all'
    this.setData({
      record: this.record,
      result: this.record.result,
      activeFilter: initial,
      durationText: formatDuration(this.record.elapsedSeconds)
    })
    this.renderItems()
  },

  changeFilter(event) {
    this.setData({ activeFilter: event.currentTarget.dataset.filter, expanded: {} })
    this.renderItems()
  },

  renderItems() {
    const filter = this.data.activeFilter
    const items = this.record.result.details.filter(detail => {
      if (filter === 'wrong') return detail.status === 'wrong' || detail.status === 'blank'
      if (filter === 'guessed') return detail.guessed
      if (filter === 'blank') return detail.status === 'blank'
      return true
    }).map(detail => {
      const question = this.questionMap[detail.questionId]
      const material = question.materialId ? this.paper.materials[question.materialId] : null
      const questionView = {
        ...question,
        options: question.options.map(option => ({
          ...option,
          userSelected: detail.userAnswer.includes(option.key),
          right: detail.answer.includes(option.key)
        }))
      }
      return {
        ...detail,
        question: questionView,
        material,
        statusText: detail.status === 'correct' ? '答对' : detail.status === 'guessed-correct' ? '蒙对' : detail.status === 'wrong' ? '答错' : detail.status === 'blank' ? '未答' : '不计分'
      }
    })
    this.setData({ reviewItems: items })
  },

  toggleItem(event) {
    const id = event.currentTarget.dataset.id
    this.setData({ [`expanded.${id}`]: !this.data.expanded[id] })
  },

  retry() {
    wx.redirectTo({ url: `/pages/exam/exam?paperId=${this.record.paperId}&mode=${this.record.mode}&moduleId=${this.record.moduleId || ''}` })
  },

  backHome() { wx.reLaunch({ url: '/pages/index/index' }) }
})
