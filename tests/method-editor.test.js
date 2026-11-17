const assert = require('assert')

let pageDefinition
const memory = new Map()
const calls = { toasts: [], backs: [], titles: [] }

global.Page = definition => { pageDefinition = definition }
global.wx = {
  getStorageSync: key => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key),
  setNavigationBarTitle: options => calls.titles.push(options.title),
  showToast: options => calls.toasts.push(options),
  navigateBack: options => calls.backs.push(options.delta),
  removeSavedFile() {},
  showModal(options) { options.success({ confirm: true, cancel: false }) }
}

require('../miniprogram/pages/method-editor/method-editor')

function setPath(target, path, value) {
  const parts = path.split('.')
  let current = target
  parts.slice(0, -1).forEach(part => {
    current[part] = current[part] || {}
    current = current[part]
  })
  current[parts[parts.length - 1]] = value
}

function createPage() {
  return {
    ...pageDefinition,
    data: JSON.parse(JSON.stringify(pageDefinition.data)),
    setData(changes) {
      Object.entries(changes).forEach(([path, value]) => setPath(this.data, path, value))
    }
  }
}

const page = createPage()
page.onLoad({})
page.inputField({ currentTarget: { dataset: { field: 'title' } }, detail: { value: '增长率速算' } })
page.inputField({ currentTarget: { dataset: { field: 'category' } }, detail: { value: '资料分析' } })
page.startExternal()
page.inputExternal({ currentTarget: { dataset: { field: 'source' } }, detail: { value: '纸质讲义' } })
page.inputExternal({ currentTarget: { dataset: { field: 'stem' } }, detail: { value: '某指标同比增长……' } })
page.inputExternal({ currentTarget: { dataset: { field: 'answer' } }, detail: { value: 'B' } })
page.addExternalExample()

assert.strictEqual(page.data.form.examples.length, 1)
assert.strictEqual(page.data.form.examples[0].sourceType, 'external')
assert.strictEqual(page.data.form.examples[0].paperTitle, '纸质讲义')

page.save()
const methods = memory.get('corn_exam_methods_v1')
assert.strictEqual(methods.length, 1)
assert.strictEqual(methods[0].title, '增长率速算')
assert.strictEqual(methods[0].examples[0].stem, '某指标同比增长……')
assert.deepStrictEqual(calls.backs, [1])

console.log('method-editor.test.js: OK')
