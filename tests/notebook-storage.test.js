const assert = require('assert')

const memory = new Map()
global.wx = {
  getStorageSync: key => memory.get(key),
  setStorageSync: (key, value) => memory.set(key, value),
  removeStorageSync: key => memory.delete(key)
}

const notebookStorage = require('../miniprogram/utils/notebook-storage')

const created = notebookStorage.saveNote({
  title: ' 资料分析草稿 ',
  category: '速算',
  background: 'dots',
  elements: [
    { id: 'stroke-1', type: 'stroke', points: [{ x: 0.1, y: 0.2 }] },
    { id: 'image-1', type: 'image', path: 'wxfile://example.jpg' }
  ]
})

assert.strictEqual(created.title, '资料分析草稿')
assert.strictEqual(created.background, 'dots')
assert.strictEqual(notebookStorage.getNotes().length, 1)
assert.deepStrictEqual(notebookStorage.getImagePaths(created), ['wxfile://example.jpg'])

const updated = notebookStorage.saveNote({ ...created, title: '新标题' })
assert.strictEqual(updated.id, created.id)
assert.strictEqual(updated.createdAt, created.createdAt)
assert.strictEqual(notebookStorage.getNote(created.id).title, '新标题')

assert.strictEqual(notebookStorage.removeNote(created.id).id, created.id)
assert.deepStrictEqual(notebookStorage.getNotes(), [])

console.log('notebook-storage.test.js: OK')
