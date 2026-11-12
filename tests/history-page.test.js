const assert = require('assert')
const { catalog } = require('../miniprogram/data/index')

let pageDefinition
const memory = new Map()
const calls = { navigations: [], modals: [], toasts: [] }

global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync: key => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key),
  navigateTo: ({ url }) => calls.navigations.push(url),
  showToast: options => calls.toasts.push(options),
  showModal(options) {
    calls.modals.push(options)
    options.success({ confirm: true, cancel: false })
  }
}

require('../miniprogram/pages/history/history')

function createPage() {
  return {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data)),
    setData(changes) { this.data = { ...this.data, ...changes } }
  }
}

const paper = catalog[0]
const examModule = paper.modules[0]
const paperDraftKey = `corn_exam_draft_v1:${paper.id}:paper:all`
const moduleDraftKey = `corn_exam_draft_v1:${paper.id}:module:${examModule.id}`
memory.set(paperDraftKey, {
  answers: { question_1: 'A' },
  guesses: {},
  elapsedSeconds: 30,
  index: 0,
  updatedAt: 1000
})
memory.set(moduleDraftKey, {
  answers: { question_1: 'B', question_2: 'C' },
  guesses: {},
  elapsedSeconds: 50,
  index: 1,
  updatedAt: 2000
})
memory.set('corn_exam_history_v1', [{
  id: 'record-1',
  paperId: paper.id,
  paperTitle: paper.title,
  moduleName: '整卷练习',
  submittedAt: 3000,
  elapsedSeconds: 60,
  trainingScore: 80,
  correct: 8,
  total: 10,
  guessed: 0,
  guessedCorrect: 0
}])
memory.set('corn_exam_record_v1:record-1', { id: 'record-1' })

const page = createPage()
page.onShow()

assert.strictEqual(page.data.drafts.length, 2)
assert.strictEqual(page.data.drafts[0].mode, 'module')
assert.strictEqual(page.data.drafts[0].actionText, '继续模块')
assert.strictEqual(page.data.drafts[1].actionText, '继续整卷')

page.continueDraft({ currentTarget: { dataset: { id: page.data.drafts[1].id } } })
assert.strictEqual(calls.navigations[0], `/packages/${paper.id}/exam/exam?mode=paper`)

page.clearAllRecords()
assert.strictEqual(memory.has('corn_exam_history_v1'), false)
assert.strictEqual(memory.has('corn_exam_record_v1:record-1'), false)
assert.strictEqual(memory.has(paperDraftKey), true)
assert.strictEqual(memory.has(moduleDraftKey), true)
assert.strictEqual(page.data.history.length, 0)
assert.strictEqual(page.data.drafts.length, 2)

console.log('history-page.test.js: OK')
