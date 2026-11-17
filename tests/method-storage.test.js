const assert = require('assert')

const memory = new Map()
global.wx = {
  getStorageSync(key) { return memory.get(key) },
  setStorageSync(key, value) { memory.set(key, value) },
  removeStorageSync(key) { memory.delete(key) }
}

const methodStorage = require('../miniprogram/utils/method-storage')

const created = methodStorage.saveMethod({
  title: ' 两期比重判断 ',
  category: '资料分析',
  recognition: '看到部分量和总体量',
  tags: '公式，易错,公式',
  examples: [{ id: 'paper:q1', sourceType: 'paper' }]
})

assert.strictEqual(created.title, '两期比重判断')
assert.deepStrictEqual(created.tags, ['公式', '易错'])
assert.strictEqual(methodStorage.getMethods().length, 1)
assert.strictEqual(methodStorage.getMethod(created.id).examples.length, 1)

const updated = methodStorage.saveMethod({ ...created, notes: '先比较增长率' })
assert.strictEqual(updated.id, created.id)
assert.strictEqual(updated.createdAt, created.createdAt)
assert.strictEqual(methodStorage.getMethods().length, 1)

methodStorage.savePrefill({ title: '预填卡片' })
assert.strictEqual(methodStorage.consumePrefill().title, '预填卡片')
assert.strictEqual(methodStorage.consumePrefill(), null)

assert.strictEqual(methodStorage.removeMethod(created.id).id, created.id)
assert.deepStrictEqual(methodStorage.getMethods(), [])

console.log('method-storage.test.js: OK')
