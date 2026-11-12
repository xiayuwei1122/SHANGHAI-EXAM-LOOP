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
  pageScrollTo() {},
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
  updatedAt: 6000
})
memory.set(moduleDraftKey, {
  answers: { question_1: 'B', question_2: 'C' },
  guesses: {},
  elapsedSeconds: 50,
  index: 1,
  updatedAt: 5000
})
const extraDraftKeys = catalog.slice(1, 4).map((item, index) => {
  const key = `corn_exam_draft_v1:${item.id}:paper:all`
  memory.set(key, {
    answers: {},
    guesses: {},
    elapsedSeconds: 10,
    index: 0,
    updatedAt: 4000 - index * 1000
  })
  return key
})
const records = Array.from({ length: 7 }, (_, index) => ({
  id: `record-${index + 1}`,
  paperId: paper.id,
  paperTitle: paper.title,
  moduleName: '整卷练习',
  submittedAt: 10000 - index,
  elapsedSeconds: 60,
  trainingScore: 80 - index,
  correct: 8,
  total: 10,
  guessed: 0,
  guessedCorrect: 0
}))
memory.set('corn_exam_history_v1', records)
records.forEach(record => memory.set(`corn_exam_record_v1:${record.id}`, record))

const page = createPage()
page.onShow()

assert.strictEqual(page.data.draftCount, 5)
assert.strictEqual(page.data.drafts.length, 4)
assert.strictEqual(page.data.draftPage, 1)
assert.strictEqual(page.data.draftTotalPages, 2)
assert.strictEqual(page.data.hasDraftPagination, true)
assert.strictEqual(page.data.drafts[0].mode, 'paper')
assert.strictEqual(page.data.drafts[0].actionText, '继续整卷')
assert.strictEqual(page.data.drafts[1].actionText, '继续模块')

assert.strictEqual(page.data.historyCount, 7)
assert.strictEqual(page.data.history.length, 6)
assert.strictEqual(page.data.historyPage, 1)
assert.strictEqual(page.data.historyTotalPages, 2)
assert.strictEqual(page.data.hasHistoryPagination, true)

page.continueDraft({ currentTarget: { dataset: { id: page.data.drafts[0].id } } })
assert.strictEqual(calls.navigations[0], `/packages/${paper.id}/exam/exam?mode=paper`)

page.nextDraftPage()
assert.strictEqual(page.data.draftPage, 2)
assert.strictEqual(page.data.drafts.length, 1)
page.previousDraftPage()
assert.strictEqual(page.data.draftPage, 1)

page.nextHistoryPage()
assert.strictEqual(page.data.historyPage, 2)
assert.strictEqual(page.data.history.length, 1)
const lastRecordId = page.data.history[0].id
page.deleteRecord({ currentTarget: { dataset: { id: lastRecordId } } })
assert.strictEqual(page.data.historyCount, 6)
assert.strictEqual(page.data.historyPage, 1)
assert.strictEqual(page.data.historyTotalPages, 1)
assert.strictEqual(page.data.hasHistoryPagination, false)
assert.strictEqual(memory.has(`corn_exam_record_v1:${lastRecordId}`), false)

page.clearAllRecords()
assert.strictEqual(memory.has('corn_exam_history_v1'), false)
assert.strictEqual(memory.has('corn_exam_record_v1:record-1'), false)
assert.strictEqual(memory.has(paperDraftKey), true)
assert.strictEqual(memory.has(moduleDraftKey), true)
extraDraftKeys.forEach(key => assert.strictEqual(memory.has(key), true))
assert.strictEqual(page.data.history.length, 0)
assert.strictEqual(page.data.historyCount, 0)
assert.strictEqual(page.data.draftCount, 5)
assert.strictEqual(page.data.drafts.length, 4)

console.log('history-page.test.js: OK')
