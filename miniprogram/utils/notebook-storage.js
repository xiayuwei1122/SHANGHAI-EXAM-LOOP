const NOTES_KEY = 'corn_exam_free_notes_v1'

function cleanText(value) { return typeof value === 'string' ? value.trim() : '' }

function getNotes() {
  const notes = wx.getStorageSync(NOTES_KEY)
  if (!Array.isArray(notes)) return []
  return notes.slice().sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
}

function getNote(id) { return getNotes().find(note => note.id === id) || null }

function saveNote(input) {
  const now = Date.now()
  const notes = getNotes()
  const previous = input.id ? notes.find(note => note.id === input.id) : null
  const note = {
    id: input.id || `note-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanText(input.title) || '未命名笔记',
    category: cleanText(input.category) || '随手记',
    background: input.background || 'grid',
    elements: Array.isArray(input.elements) ? input.elements : [],
    createdAt: previous?.createdAt || input.createdAt || now,
    updatedAt: now
  }
  wx.setStorageSync(NOTES_KEY, [note].concat(notes.filter(item => item.id !== note.id)))
  return note
}

function removeNote(id) {
  const notes = getNotes()
  const removed = notes.find(note => note.id === id) || null
  const next = notes.filter(note => note.id !== id)
  if (next.length) wx.setStorageSync(NOTES_KEY, next)
  else wx.removeStorageSync(NOTES_KEY)
  return removed
}

function getImagePaths(note) {
  return (note?.elements || [])
    .filter(element => element.type === 'image' && element.path)
    .map(element => element.path)
}

module.exports = { getNotes, getNote, saveNote, removeNote, getImagePaths }
