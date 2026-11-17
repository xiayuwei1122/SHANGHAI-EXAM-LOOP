const assert = require('assert')

let pageDefinition
const notes = Array.from({ length: 8 }, (_, index) => ({
  id: `note-${index + 1}`,
  title: `自由笔记 ${index + 1}`,
  category: index < 7 ? '资料分析' : '数量关系',
  background: 'grid',
  elements: index === 7 ? [{ id: 'text-1', type: 'text', text: '方程速算' }] : [],
  updatedAt: 100 - index
}))

global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync(key) {
    if (key === 'corn_exam_free_notes_v1') return notes
    if (key === 'corn_exam_methods_v1') return []
    return undefined
  },
  pageScrollTo() {},
  navigateTo() {}
}

require('../miniprogram/pages/methods/methods')

const page = {
  ...pageDefinition,
  data: JSON.parse(JSON.stringify(pageDefinition.data)),
  setData(changes) { this.data = { ...this.data, ...changes } }
}

page.onShow()
assert.strictEqual(page.data.items.length, 6)
assert.strictEqual(page.data.matchCount, 8)
assert.strictEqual(page.data.currentPage, 1)
assert.strictEqual(page.data.totalPages, 2)
assert.strictEqual(page.data.hasPagination, true)

page.nextPage()
assert.strictEqual(page.data.currentPage, 2)
assert.strictEqual(page.data.items.length, 2)

page.search({ detail: { value: '方程速算' } })
assert.strictEqual(page.data.currentPage, 1)
assert.strictEqual(page.data.matchCount, 1)
assert.strictEqual(page.data.items[0].id, 'note-8')
assert.strictEqual(page.data.hasPagination, false)

page.applyFilters('资料分析', '')
assert.strictEqual(page.data.matchCount, 7)
assert.strictEqual(page.data.totalPages, 2)

console.log('methods-page.test.js: OK')
