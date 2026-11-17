const METHODS_KEY = 'corn_exam_methods_v1'
const PREFILL_KEY = 'corn_exam_method_prefill_v1'

function text(value) { return typeof value === 'string' ? value.trim() : '' }

function normalizeTags(tags) {
  const values = Array.isArray(tags) ? tags : String(tags || '').split(/[,，]/)
  return Array.from(new Set(values.map(text).filter(Boolean))).slice(0, 12)
}

function getMethods() {
  const methods = wx.getStorageSync(METHODS_KEY)
  if (!Array.isArray(methods)) return []
  return methods.slice().sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
}

function getMethod(id) {
  return getMethods().find(item => item.id === id) || null
}

function saveMethod(input) {
  const now = Date.now()
  const methods = getMethods()
  const previous = input.id ? methods.find(item => item.id === input.id) : null
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
  const next = [method].concat(methods.filter(item => item.id !== method.id))
  wx.setStorageSync(METHODS_KEY, next)
  return method
}

function removeMethod(id) {
  const methods = getMethods()
  const removed = methods.find(item => item.id === id) || null
  const next = methods.filter(item => item.id !== id)
  if (next.length) wx.setStorageSync(METHODS_KEY, next)
  else wx.removeStorageSync(METHODS_KEY)
  return removed
}

function savePrefill(prefill) { wx.setStorageSync(PREFILL_KEY, prefill) }

function consumePrefill() {
  const prefill = wx.getStorageSync(PREFILL_KEY) || null
  wx.removeStorageSync(PREFILL_KEY)
  return prefill
}

module.exports = {
  getMethods,
  getMethod,
  saveMethod,
  removeMethod,
  savePrefill,
  consumePrefill,
  normalizeTags
}
