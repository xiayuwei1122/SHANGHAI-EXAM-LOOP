const assert = require('assert')

let pageDefinition
const memory = new Map()
const calls = { navigations: [], modals: [] }
let confirmModal = false
global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync: key => memory.get(key),
  removeStorageSync: key => memory.delete(key),
  pageScrollTo() {},
  navigateTo({ url }) { calls.navigations.push(url) },
  showModal(options) {
    calls.modals.push(options)
    options.success({ confirm: confirmModal, cancel: !confirmModal })
  }
}

require('../miniprogram/pages/index/index')

function createPage() {
  return {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data)),
    setData(changes) { this.data = { ...this.data, ...changes } }
  }
}

const page = createPage()
page.onShow()

assert.strictEqual(page.data.selectedExamType, 'city-exam')
assert.strictEqual(page.data.selectedExamTypeLabel, '市考')
assert.strictEqual(page.data.paperCount, 10)
assert.strictEqual(page.data.papers.length, 4)
assert.strictEqual(page.data.papers.every(item => item.examType === 'city-exam'), true)
assert.deepStrictEqual(page.data.papers.slice(0, 3).map(item => item.year), [2025, 2025, 2023])
assert.strictEqual(page.data.currentPage, 1)
assert.strictEqual(page.data.totalPages, 3)
assert.strictEqual(page.data.hasPagination, true)
assert.strictEqual(page.data.selectedYearLabel, '全部年份')

page.nextPage()
assert.strictEqual(page.data.currentPage, 2)
assert.deepStrictEqual(page.data.papers.map(item => item.year), [2021, 2021, 2020, 2020])
page.nextPage()
assert.strictEqual(page.data.currentPage, 3)
assert.deepStrictEqual(page.data.papers.map(item => item.year), [2019, 2019])
page.previousPage()
assert.strictEqual(page.data.currentPage, 2)

page.selectYear({ detail: { value: 1 } })
assert.strictEqual(page.data.selectedYear, '2025')
assert.strictEqual(page.data.selectedYearLabel, '2025 年')
assert.strictEqual(page.data.papers.length, 2)
assert.strictEqual(page.data.papers.every(item => item.year === 2025), true)
assert.strictEqual(page.data.paperCount, 2)
assert.strictEqual(page.data.currentPage, 1)
assert.strictEqual(page.data.hasPagination, false)

const institutionIndex = page.data.examTypes.findIndex(item => item.value === 'public-institution')
page.selectExamType({ detail: { value: institutionIndex } })
assert.strictEqual(page.data.selectedExamType, 'public-institution')
assert.strictEqual(page.data.papers.length, 0)
assert.strictEqual(page.data.paperCount, 0)
assert.strictEqual(page.data.years.length, 1)
assert.strictEqual(page.data.emptyTitle, '事业单位试卷正在整理')

page.selectExamType({ detail: { value: 0 } })
assert.strictEqual(page.data.selectedExamType, 'all')
assert.strictEqual(page.data.paperCount, 10)
assert.strictEqual(page.data.papers.length, 4)
assert.strictEqual(page.data.hasPagination, true)

const draftPaperId = page.data.papers[0].id
memory.set(`corn_exam_draft_v1:${draftPaperId}:paper:all`, {
  answers: { q1: 'A', q2: 'B' },
  guesses: {},
  elapsedSeconds: 30,
  index: 1
})
const pageWithDraft = createPage()
pageWithDraft.onShow()
const paperWithDraft = pageWithDraft.data.papers.find(item => item.id === draftPaperId)
assert.strictEqual(paperWithDraft.hasDraft, true)
assert.strictEqual(paperWithDraft.draftAnsweredCount, 2)

pageWithDraft.startPaper({ currentTarget: { dataset: { paper: draftPaperId } } })
assert.strictEqual(calls.modals.length, 1)
assert.strictEqual(calls.modals[0].title, '重新开始整卷？')
assert.strictEqual(calls.navigations.length, 0)
assert.strictEqual(memory.has(`corn_exam_draft_v1:${draftPaperId}:paper:all`), true)

confirmModal = true
pageWithDraft.startPaper({ currentTarget: { dataset: { paper: draftPaperId } } })
assert.strictEqual(memory.has(`corn_exam_draft_v1:${draftPaperId}:paper:all`), false)
assert.strictEqual(calls.navigations[0], `/packages/${draftPaperId}/exam/exam?mode=paper`)

console.log('index-page.test.js: OK')
