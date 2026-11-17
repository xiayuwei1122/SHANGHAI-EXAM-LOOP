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
page.inputField({ currentTarget: { dataset: { field: 'content' } }, detail: { value: '先估算，再校验选项' } })
page.startExternal()
page.inputExternal({ currentTarget: { dataset: { field: 'content' } }, detail: { value: '纸质讲义\n某指标同比增长……\n答案：B' } })
page.addExternalExample()

assert.strictEqual(page.data.form.examples.length, 1)
assert.strictEqual(page.data.form.examples[0].sourceType, 'external')
assert.strictEqual(page.data.form.examples[0].content, '纸质讲义\n某指标同比增长……\n答案：B')

page.save()
const methods = memory.get('corn_exam_methods_v1')
assert.strictEqual(methods.length, 1)
assert.strictEqual(methods[0].title, '增长率速算')
assert.strictEqual(methods[0].content, '先估算，再校验选项')
assert.strictEqual(methods[0].examples[0].content, '纸质讲义\n某指标同比增长……\n答案：B')
assert.deepStrictEqual(calls.backs, [1])

const methodStorage = require('../miniprogram/utils/method-storage')
const legacyMethod = methodStorage.saveMethod({
  title: '旧方法卡',
  category: '资料分析',
  recognition: '看到现期和基期',
  steps: '先列式再估算',
  pitfalls: '注意单位',
  notes: '',
  tags: [],
  images: [],
  examples: [{
    id: 'legacy-question', sourceType: 'external', paperTitle: '纸质卷',
    stem: '旧题干', answer: 'C', explanation: '旧解析', images: []
  }]
})
const legacyPage = createPage()
legacyPage.onLoad({ id: legacyMethod.id })
assert.ok(legacyPage.data.form.content.includes('识别信号\n看到现期和基期'))
assert.ok(legacyPage.data.form.content.includes('易错点\n注意单位'))
assert.ok(legacyPage.data.form.examples[0].content.includes('参考答案：C'))

console.log('method-editor.test.js: OK')
