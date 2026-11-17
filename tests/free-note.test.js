const assert = require('assert')

let pageDefinition
const memory = new Map()
const calls = { titles: [], toasts: [], backs: [] }

global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync: key => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key),
  setNavigationBarTitle: ({ title }) => calls.titles.push(title),
  showModal(options) { options.success({ confirm: true, cancel: false, content: '先找题目的识别信号' }) },
  showToast: options => calls.toasts.push(options.title),
  navigateBack: ({ delta }) => calls.backs.push(delta),
  removeSavedFile() {}
}

require('../miniprogram/pages/free-note/free-note')

function createPage() {
  return {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data)),
    setData(changes) { this.data = { ...this.data, ...changes } }
  }
}

const page = createPage()
page.onLoad({})
page.inputMeta({ currentTarget: { dataset: { field: 'title' } }, detail: { value: '我的资料分析画布' } })
page.inputMeta({ currentTarget: { dataset: { field: 'category' } }, detail: { value: '资料分析' } })
page.addText()

assert.strictEqual(page.elements.length, 1)
assert.strictEqual(page.elements[0].type, 'text')
assert.strictEqual(page.elements[0].text, '先找题目的识别信号')
assert.strictEqual(page.data.selectedTool, 'select')

page.saveAndBack()
const notes = memory.get('corn_exam_free_notes_v1')
assert.strictEqual(notes.length, 1)
assert.strictEqual(notes[0].title, '我的资料分析画布')
assert.strictEqual(notes[0].elements.length, 1)
assert.deepStrictEqual(calls.backs, [1])

const reloaded = createPage()
reloaded.onLoad({ id: notes[0].id })
assert.strictEqual(reloaded.data.isEditing, true)
assert.strictEqual(reloaded.elements[0].text, '先找题目的识别信号')

console.log('free-note.test.js: OK')
