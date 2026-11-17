const NOTES_KEY = 'corn_exam_free_notes_v1'
let notesCache = null

function cleanText(value) { return typeof value === 'string' ? value.trim() : '' }

function readNotes() {
  if (notesCache) return notesCache
  const notes = wx.getStorageSync(NOTES_KEY)
  notesCache = Array.isArray(notes) ? notes : []
  return notesCache
}

function getNotes() {
  return readNotes().slice().sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
}

function getNote(id) { return getNotes().find(note => note.id === id) || null }

function getNoteSummaries() {
  return getNotes().map(note => {
    const elements = note.elements || []
    const searchableText = elements
      .filter(element => element.type === 'text')
      .map(element => element.text)
      .join(' ')
      .trim()
    return {
      id: note.id,
      title: note.title,
      category: note.category,
      background: note.background,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      elementCount: elements.length,
      strokeCount: elements.filter(element => element.type === 'stroke').length,
      imageCount: elements.filter(element => element.type === 'image').length,
      searchableText
    }
  })
}

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
  notesCache = [note].concat(notes.filter(item => item.id !== note.id))
  wx.setStorageSync(NOTES_KEY, notesCache)
  return note
}

function removeNote(id) {
  const notes = getNotes()
  const removed = notes.find(note => note.id === id) || null
  const next = notes.filter(note => note.id !== id)
  notesCache = next
  if (next.length) wx.setStorageSync(NOTES_KEY, notesCache)
  else wx.removeStorageSync(NOTES_KEY)
  return removed
}

function getImagePaths(note) {
  return (note?.elements || [])
    .filter(element => element.type === 'image' && element.path)
    .map(element => element.path)
}

module.exports = { getNotes, getNote, getNoteSummaries, saveNote, removeNote, getImagePaths }
