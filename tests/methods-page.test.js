const assert = require('assert')

let pageDefinition
const notes = Array.from({ length: 8 }, (_, index) => ({
  id: `note-${index + 1}`,
  title: `自由笔记 ${index + 1}`,
  category: index < 7 ? '资料分析' : '数量关系',
  background: 'grid',
  elements: index === 7
    ? [{ id: 'text-1', type: 'text', text: '方程速算' }]
    : (index === 0 ? [{ id: 'image-1', type: 'image', path: 'wxfile://note-1.jpg' }] : []),
  updatedAt: 100 - index
}))

let storedNotes = notes.slice()
let removedFilePath = ''
let toastTitle = ''

global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync(key) {
    if (key === 'corn_exam_free_notes_v1') return storedNotes
    if (key === 'corn_exam_methods_v1') return []
    return undefined
  },
  setStorageSync(key, value) {
    if (key === 'corn_exam_free_notes_v1') storedNotes = value
  },
  removeStorageSync(key) {
    if (key === 'corn_exam_free_notes_v1') storedNotes = []
  },
  pageScrollTo() {},
  navigateTo() {},
  removeSavedFile({ filePath }) { removedFilePath = filePath },
  showModal(options) { options.success({ confirm: true }) },
  showToast(options) { toastTitle = options.title }
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

page.deleteItem({ currentTarget: { dataset: { id: 'note-1', kind: 'free' } } })
assert.strictEqual(storedNotes.length, 7)
assert.strictEqual(storedNotes.some(item => item.id === 'note-1'), false)
assert.strictEqual(removedFilePath, 'wxfile://note-1.jpg')
assert.strictEqual(toastTitle, '已删除')
assert.strictEqual(page.data.matchCount, 6)
assert.strictEqual(page.data.totalPages, 1)

console.log('methods-page.test.js: OK')
