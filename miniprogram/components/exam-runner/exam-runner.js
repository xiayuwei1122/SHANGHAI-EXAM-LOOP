const storage = require('../../utils/storage')
const { normalize, scoreAttempt } = require('../../utils/score')

function formatTime(seconds) {
  const value = Math.max(0, seconds)
  const hour = String(Math.floor(value / 3600)).padStart(2, '0')
  const minute = String(Math.floor(value % 3600 / 60)).padStart(2, '0')
  const second = String(value % 60).padStart(2, '0')
  return `${hour}:${minute}:${second}`
}

Component({
  options: { styleIsolation: 'apply-shared' },
  data: {
    paperTitle: '', title: '', mode: 'paper', current: 0, total: 0,
    question: null, material: null, selected: '', guessed: false,
    answeredCount: 0, guessedCount: 0, timerText: '02:00:00', timerLabel: '剩余',
    showSheet: false, answerCells: []
  },
  lifetimes: { detached() { this.stopTimer(); this.persistDraft() } },
  methods: {
    init(paper, options) {
      this.paper = paper
      this.mode = options.mode === 'module' ? 'module' : 'paper'
      this.moduleId = options.moduleId || ''
      const module = paper.modules.find(item => item.id === this.moduleId)
      this.questionIds = this.mode === 'module' && module ? module.questionIds : paper.questions.map(item => item.id)
      this.questionsById = Object.create(null)
      paper.questions.forEach(question => { this.questionsById[question.id] = question })
      const saved = storage.getDraft(paper.id, this.mode, this.moduleId)
      this.answers = saved?.answers || {}
      this.guesses = saved?.guesses || {}
      this.elapsedSeconds = saved?.elapsedSeconds || 0
      this.index = Math.min(saved?.index || 0, this.questionIds.length - 1)
      this.setData({
        paperTitle: paper.title,
        title: this.mode === 'module' && module ? module.name : '整卷练习',
        mode: this.mode,
        total: this.questionIds.length,
        timerLabel: this.mode === 'paper' ? '剩余' : '用时'
      })
      this.renderQuestion()
      this.startTimer()
    },
    handleHide() { this.persistDraft() },
    startTimer() {
      this.stopTimer()
      this.timer = setInterval(() => {
        this.elapsedSeconds += 1
        if (this.mode === 'paper' && this.elapsedSeconds >= 7200) {
          this.elapsedSeconds = 7200
          this.stopTimer()
          this.submit(true)
          return
        }
        this.renderTimer()
        if (this.elapsedSeconds % 10 === 0) this.persistDraft()
      }, 1000)
      this.renderTimer()
    },
    stopTimer() { if (this.timer) clearInterval(this.timer); this.timer = null },
    renderTimer() {
      const seconds = this.mode === 'paper' ? 7200 - this.elapsedSeconds : this.elapsedSeconds
      this.setData({ timerText: formatTime(seconds) })
    },
    renderQuestion() {
      if (!this.paper || !this.questionIds?.length) return
      const question = this.questionsById[this.questionIds[this.index]]
      const material = question.materialId ? this.paper.materials[question.materialId] : null
      const selected = normalize(this.answers[question.id])
      const questionView = { ...question, options: question.options.map(option => ({ ...option, selected: selected.includes(option.key) })) }
      const answerCells = this.questionIds.map((id, index) => ({
        index, number: this.questionsById[id].number,
        answered: Boolean(normalize(this.answers[id])), guessed: Boolean(this.guesses[id]), current: index === this.index
      }))
      this.setData({
        current: this.index + 1, question: questionView, material, selected,
        guessed: Boolean(this.guesses[question.id]),
        answeredCount: Object.values(this.answers).filter(Boolean).length,
        guessedCount: Object.values(this.guesses).filter(Boolean).length,
        answerCells
      })
      wx.pageScrollTo({ scrollTop: 0, duration: 0 })
    },
    chooseOption(event) {
      const question = this.data.question
      const choice = event.currentTarget.dataset.choice
      let selected = normalize(this.answers[question.id])
      if (question.multi) selected = selected.includes(choice) ? selected.replace(choice, '') : normalize(selected + choice)
      else selected = selected === choice ? '' : choice
      if (selected) this.answers[question.id] = selected
      else delete this.answers[question.id]
      this.persistDraft(); this.renderQuestion()
    },
    toggleGuess() {
      const id = this.data.question.id
      if (this.guesses[id]) delete this.guesses[id]
      else this.guesses[id] = true
      this.persistDraft(); this.renderQuestion()
    },
    previous() { if (this.index > 0) { this.index -= 1; this.renderQuestion() } },
    next() { if (this.index < this.questionIds.length - 1) { this.index += 1; this.renderQuestion() } else this.confirmSubmit() },
    openSheet() { this.setData({ showSheet: true }) },
    closeSheet() { this.setData({ showSheet: false }) },
    stopBubble() {},
    jumpQuestion(event) { this.index = Number(event.currentTarget.dataset.index); this.setData({ showSheet: false }); this.renderQuestion() },
    persistDraft() {
      if (!this.paper) return
      storage.saveDraft(this.paper.id, this.mode, this.moduleId, {
        answers: this.answers, guesses: this.guesses, elapsedSeconds: this.elapsedSeconds,
        index: this.index, updatedAt: Date.now()
      })
    },
    confirmSubmit() {
      const blank = this.questionIds.length - Object.values(this.answers).filter(Boolean).length
      wx.showModal({
        title: blank ? `还有 ${blank} 题未答` : '确认交卷？',
        content: '交卷后可以查看所有错题、蒙对题和解析。', confirmText: '交卷',
        success: result => { if (result.confirm) this.submit(false) }
      })
    },
    submit(auto) {
      this.stopTimer()
      const result = scoreAttempt(this.paper, this.questionIds, this.answers, this.guesses)
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const module = this.paper.modules.find(item => item.id === this.moduleId)
      storage.saveRecord({
        id, paperId: this.paper.id, paperTitle: this.paper.title, mode: this.mode,
        moduleId: this.moduleId, moduleName: module?.name || '整卷练习', questionIds: this.questionIds,
        answers: this.answers, guesses: this.guesses, elapsedSeconds: this.elapsedSeconds,
        submittedAt: Date.now(), autoSubmitted: auto, result
      })
      storage.clearDraft(this.paper.id, this.mode, this.moduleId)
      wx.redirectTo({ url: `/packages/${this.paper.id}/result/result?recordId=${id}` })
    }
  }
})
