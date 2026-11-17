const { createJsonDocumentStore } = require('./local-json-store')

const METHODS_KEY = 'corn_exam_methods_v1'
const PREFILL_KEY = 'corn_exam_method_prefill_v1'

function text(value) { return typeof value === 'string' ? value.trim() : '' }

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags || '').split(/[,，]/)
  return Array.from(new Set(values.map(text).filter(Boolean))).slice(0, 12)
}

function summarize(method) {
  const examples = method.examples || []
  const images = method.images || []
  return {
    title: method.title,
    category: method.category,
    content: String(method.content || '').slice(0, 500),
    tags: method.tags,
    exampleCount: examples.length,
    imageCount: images.length + examples.reduce(
      (count, example) => count + (example.images || []).length,
      0
    ),
    searchableText: [
      method.title,
      method.category,
      method.content,
      method.recognition,
      method.steps,
      method.pitfalls,
      method.notes,
      ...(method.tags || []),
      ...examples.map(example => [
        example.content,
        example.stem,
        example.answer,
        example.explanation
      ].join(' '))
    ].join(' ').trim().slice(0, 3000),
    createdAt: method.createdAt,
    updatedAt: method.updatedAt
  }
}

const store = createJsonDocumentStore({
  legacyKey: METHODS_KEY,
  indexFile: 'methods-index.json',
  directory: 'methods',
  summarize
})

function getMethods() { return store.list() }

function getMethodSummaries() { return store.listSummaries() }

function getMethod(id) { return store.get(id) }

function saveMethod(input) {
  const now = Date.now()
  const previous = input.id ? getMethod(input.id) : null
  const method = {
    id: input.id || `method-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: text(input.title),
    category: text(input.category) || '未分类',
    content: text(input.content),
    recognition: text(input.recognition),
    steps: text(input.steps),
    pitfalls: text(input.pitfalls),
    notes: text(input.notes),
    tags: normalizeTags(input.tags),
    examples: Array.isArray(input.examples) ? input.examples : [],
    images: Array.isArray(input.images) ? input.images.filter(Boolean) : [],
    createdAt: previous?.createdAt || input.createdAt || now,
    updatedAt: now
  }
  return store.save(method)
}

function removeMethod(id) { return store.remove(id) }

function savePrefill(prefill) { wx.setStorageSync(PREFILL_KEY, prefill) }

function consumePrefill() {
  const prefill = wx.getStorageSync(PREFILL_KEY) || null
  wx.removeStorageSync(PREFILL_KEY)
  return prefill
}

function getEstimatedBytes() { return store.estimatedBytes() }

module.exports = {
  getMethods,
  getMethodSummaries,
  getMethod,
  saveMethod,
  removeMethod,
  savePrefill,
  consumePrefill,
  normalizeTags,
  getEstimatedBytes
}
