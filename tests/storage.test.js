const assert = require('assert')

const memory = new Map()
global.wx = {
  getStorageSync(key) { return memory.get(key) },
  setStorageSync(key, value) { memory.set(key, value) },
  removeStorageSync(key) { memory.delete(key) }
}

const storage = require('../miniprogram/utils/storage')

function record(index) {
  return {
    id: `record-${index}`,
    paperId: 'sh-2025-a',
    paperTitle: '2025 上海市考行测 A 类',
    mode: 'paper',
    moduleId: null,
    moduleName: '整卷',
    submittedAt: index,
    elapsedSeconds: 60,
    result: {
      trainingScore: index,
      correct: index,
      scored: 100,
      guessed: 0,
      guessedCorrect: 0
    }
  }
}

for (let index = 0; index < 62; index += 1) storage.saveRecord(record(index))

assert.strictEqual(storage.getHistory().length, 60)
assert.strictEqual(storage.getHistory()[0].id, 'record-61')
assert.strictEqual(storage.getRecord('record-0'), null)
assert.strictEqual(storage.getRecord('record-1'), null)

storage.removeRecord('record-61')
assert.strictEqual(storage.getHistory().length, 59)
assert.strictEqual(storage.getRecord('record-61'), null)

assert.strictEqual(storage.clearHistory(), 59)
assert.deepStrictEqual(storage.getHistory(), [])
assert.strictEqual(storage.getRecord('record-60'), null)

console.log('storage.test.js: OK')
