const assert = require('assert')

const storage = new Map()
const files = new Map()
const directories = new Set(['/user'])

const fileSystem = {
  accessSync(path) {
    if (!directories.has(path) && !files.has(path)) throw new Error('not found')
  },
  mkdirSync(path) { directories.add(path) },
  readFileSync(path) {
    if (!files.has(path)) throw new Error('not found')
    return files.get(path)
  },
  writeFileSync(path, content) { files.set(path, content) },
  unlinkSync(path) {
    if (!files.has(path)) throw new Error('not found')
    files.delete(path)
  }
}

global.wx = {
  env: { USER_DATA_PATH: '/user' },
  getFileSystemManager: () => fileSystem,
  getStorageSync: key => storage.get(key),
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: key => storage.delete(key)
}

const { createJsonDocumentStore } = require('../miniprogram/utils/local-json-store')

storage.set('legacy_documents', [
  { id: 'note-1', title: '旧笔记', updatedAt: 1, content: '迁移内容' }
])

const store = createJsonDocumentStore({
  legacyKey: 'legacy_documents',
  indexFile: 'test-index.json',
  directory: 'test-documents',
  summarize: document => ({ title: document.title, updatedAt: document.updatedAt })
})

assert.strictEqual(store.listSummaries().length, 1)
assert.strictEqual(storage.has('legacy_documents'), false)
assert.strictEqual(store.get('note-1').content, '迁移内容')
assert.strictEqual(files.has('/user/yijuan-document-data-v2/test-documents/note-1.json'), true)

store.save({ id: 'note-2', title: '新笔记', updatedAt: 2, content: '单独文件' })
assert.strictEqual(store.listSummaries()[0].id, 'note-2')
assert.strictEqual(store.get('note-2').content, '单独文件')
assert.strictEqual(store.estimatedBytes() > 0, true)

assert.strictEqual(store.remove('note-1').title, '旧笔记')
assert.strictEqual(store.get('note-1'), null)
assert.strictEqual(files.has('/user/yijuan-document-data-v2/test-documents/note-1.json'), false)

console.log('local-json-store.test.js: OK')
