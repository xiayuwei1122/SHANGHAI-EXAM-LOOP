const storage = require('../../utils/storage')
const methodStorage = require('../../utils/method-storage')

function formatDuration(seconds) {
  const minute = Math.floor(seconds / 60)
  const second = seconds % 60
  return `${minute}分${second ? `${second}秒` : ''}`
}

Component({
  options: { styleIsolation: 'apply-shared' },
  data: {
    record: null, result: null,
    filters: [
      { id: 'all', name: '全部' }, { id: 'wrong', name: '错题' },
      { id: 'guessed', name: '蒙题' }, { id: 'blank', name: '未答' }
    ],
    activeFilter: 'wrong', reviewItems: [], durationText: '', expanded: {}
  },
  methods: {
    init(paper, options) {
      this.paper = paper
      this.record = storage.getRecord(options.recordId)
      if (!this.record) { wx.showToast({ title: '记录不存在', icon: 'none' }); return }
      this.questionMap = Object.create(null)
      paper.questions.forEach(question => { this.questionMap[question.id] = question })
      const initial = this.record.result.wrong || this.record.result.blank ? 'wrong' : 'all'
      this.setData({
        record: this.record, result: this.record.result, activeFilter: initial,
        durationText: formatDuration(this.record.elapsedSeconds)
      })
      this.renderItems()
    },
    handleHide() {},
    changeFilter(event) { this.setData({ activeFilter: event.currentTarget.dataset.filter, expanded: {} }); this.renderItems() },
    renderItems() {
      if (!this.record) return
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
            ...option, userSelected: detail.userAnswer.includes(option.key), right: detail.answer.includes(option.key)
          }))
        }
        return {
          ...detail, question: questionView, material,
          statusText: detail.status === 'correct' ? '答对' : detail.status === 'guessed-correct' ? '蒙对' : detail.status === 'wrong' ? '答错' : detail.status === 'blank' ? '未答' : '不计分'
        }
      })
      this.setData({ reviewItems: items })
    },
    toggleItem(event) {
      const id = event.currentTarget.dataset.id
      this.setData({ [`expanded.${id}`]: !this.data.expanded[id] })
    },
    saveAsMethod(event) {
      const item = this.data.reviewItems.find(detail => detail.questionId === event.currentTarget.dataset.id)
      if (!item) return
      const question = item.question
      methodStorage.savePrefill({
        title: `${question.type || '这类题'}的解题方法`,
        category: question.moduleName || '未分类',
        recognition: '',
        steps: '',
        pitfalls: '',
        notes: '',
        tags: ['典型题', item.statusText],
        images: [],
        examples: [{
          id: `${this.paper.id}:${question.id}`,
          sourceType: 'paper',
          paperId: this.paper.id,
          paperTitle: this.paper.title,
          questionId: question.id,
          number: question.number,
          moduleName: question.moduleName,
          type: question.type,
          stem: question.stem,
          answer: item.answer,
          userAnswer: item.userAnswer,
          explanation: question.explanation,
          images: []
        }]
      })
      wx.navigateTo({ url: '/pages/method-editor/method-editor?from=review' })
    },
    retry() { wx.redirectTo({ url: `/packages/${this.paper.id}/exam/exam?mode=${this.record.mode}&moduleId=${this.record.moduleId || ''}` }) },
    backHome() { wx.reLaunch({ url: '/pages/index/index' }) }
  }
})
