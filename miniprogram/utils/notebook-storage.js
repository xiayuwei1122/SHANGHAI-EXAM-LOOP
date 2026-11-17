const { createJsonDocumentStore } = require('./local-json-store')

const NOTES_KEY = 'corn_exam_free_notes_v1'

function cleanText(value) { return typeof value === 'string' ? value.trim() : '' }

function summarize(note) {
  const elements = note.elements || []
  return {
    title: note.title,
    category: note.category,
    background: note.background,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    elementCount: elements.length,
    strokeCount: elements.filter(element => element.type === 'stroke').length,
    imageCount: elements.filter(element => element.type === 'image').length,
    searchableText: elements
      .filter(element => element.type === 'text')
      .map(element => element.text)
      .join(' ')
      .trim()
      .slice(0, 2000)
  }
}

const store = createJsonDocumentStore({
  legacyKey: NOTES_KEY,
  indexFile: 'free-notes-index.json',
  directory: 'free-notes',
  summarize
})

function getNotes() { return store.list() }

function getNote(id) { return store.get(id) }

function getNoteSummaries() { return store.listSummaries() }

function saveNote(input) {
  const now = Date.now()
  const previous = input.id ? getNote(input.id) : null
  const note = {
    id: input.id || `note-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanText(input.title) || '未命名笔记',
    category: cleanText(input.category) || '随手记',
    background: input.background || 'grid',
    elements: Array.isArray(input.elements) ? input.elements : [],
    createdAt: previous?.createdAt || input.createdAt || now,
    updatedAt: now
  }
  return store.save(note)
}

function removeNote(id) {
  return store.remove(id)
}

function getImagePaths(note) {
  return (note?.elements || [])
    .filter(element => element.type === 'image' && element.path)
    .map(element => element.path)
}

function getEstimatedBytes() { return store.estimatedBytes() }

module.exports = {
  getNotes,
  getNote,
  getNoteSummaries,
  saveNote,
  removeNote,
  getImagePaths,
  getEstimatedBytes
}
