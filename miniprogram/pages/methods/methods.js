const methodStorage = require('../../utils/method-storage')
const notebookStorage = require('../../utils/notebook-storage')

const PAGE_SIZE = 6

function snippet(value) {
  const content = String(value || '').trim()
  return content.length > 70 ? `${content.slice(0, 70)}…` : content
}

function dateText(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

function noteSummary(note) {
  const elements = note.elements || []
  const strokes = elements.filter(item => item.type === 'stroke').length
  const texts = elements.filter(item => item.type === 'text')
  const images = elements.filter(item => item.type === 'image').length
  const preview = texts.map(item => item.text).join(' ').trim()
  if (preview) return snippet(preview)
  if (!elements.length) return '一张空白画布，等你自由发挥'
  return `手写 ${strokes} 笔 · 图片 ${images} 张`
}

Page({
  data: {
    items: [],
    entryCount: 0,
    matchCount: 0,
    currentPage: 1,
    totalPages: 1,
    hasPagination: false,
    categories: [],
    selectedCategory: '全部',
    keyword: ''
  },

  onShow() {
    const notes = notebookStorage.getNotes().map(note => ({
      ...note,
      kind: 'free',
      kindLabel: '自由笔记',
      summary: noteSummary(note),
      dateText: dateText(note.updatedAt),
      strokeCount: (note.elements || []).filter(item => item.type === 'stroke').length,
      imageCount: (note.elements || []).filter(item => item.type === 'image').length,
      searchableText: (note.elements || []).filter(item => item.type === 'text').map(item => item.text).join(' ')
    }))
    const methods = methodStorage.getMethods().map(method => ({
      ...method,
      kind: 'structured',
      kindLabel: '方法卡',
      summary: snippet(method.recognition || method.steps || method.notes) || '还没有补充方法说明',
      dateText: dateText(method.updatedAt),
      exampleCount: (method.examples || []).length,
      imageCount: (method.images || []).length + (method.examples || []).reduce(
        (count, example) => count + (example.images || []).length,
        0
      )
    }))
    this.allItems = notes.concat(methods).sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
    const counts = this.allItems.reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + 1
      return result
    }, {})
    const categories = [{ name: '全部', count: this.allItems.length }].concat(
      Object.keys(counts).sort().map(name => ({ name, count: counts[name] }))
    )
    const selectedCategory = categories.some(item => item.name === this.data.selectedCategory)
      ? this.data.selectedCategory
      : '全部'
    this.setData({ categories, entryCount: this.allItems.length, selectedCategory })
    this.applyFilters(selectedCategory, this.data.keyword, this.data.currentPage)
  },

  applyFilters(category, keyword, requestedPage = 1) {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase()
    const filtered = (this.allItems || []).filter(item => {
      if (category !== '全部' && item.category !== category) return false
      if (!normalizedKeyword) return true
      const searchable = [
        item.title, item.category, item.kindLabel, item.recognition, item.steps,
        item.pitfalls, item.notes, item.searchableText, ...(item.tags || [])
      ].join(' ').toLowerCase()
      return searchable.includes(normalizedKeyword)
    })
    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const currentPage = Math.min(Math.max(Number(requestedPage) || 1, 1), totalPages)
    const start = (currentPage - 1) * PAGE_SIZE
    this.setData({
      items: filtered.slice(start, start + PAGE_SIZE),
      matchCount: filtered.length,
      currentPage,
      totalPages,
      hasPagination: filtered.length > PAGE_SIZE,
      selectedCategory: category,
      keyword
    })
  },

  search(event) { this.applyFilters(this.data.selectedCategory, event.detail.value) },

  selectCategory(event) { this.applyFilters(event.currentTarget.dataset.name, this.data.keyword) },

  previousPage() {
    if (this.data.currentPage <= 1) return
    this.applyFilters(this.data.selectedCategory, this.data.keyword, this.data.currentPage - 1)
    wx.pageScrollTo({ selector: '#method-list-anchor', duration: 200 })
  },

  nextPage() {
    if (this.data.currentPage >= this.data.totalPages) return
    this.applyFilters(this.data.selectedCategory, this.data.keyword, this.data.currentPage + 1)
    wx.pageScrollTo({ selector: '#method-list-anchor', duration: 200 })
  },

  createFreeNote() { wx.navigateTo({ url: '/pages/free-note/free-note' }) },

  createMethod() { wx.navigateTo({ url: '/pages/method-editor/method-editor' }) },

  editItem(event) {
    const { id, kind } = event.currentTarget.dataset
    const url = kind === 'free'
      ? `/pages/free-note/free-note?id=${id}`
      : `/pages/method-editor/method-editor?id=${id}`
    wx.navigateTo({ url })
  },

  deleteItem(event) {
    const { id, kind } = event.currentTarget.dataset
    const isFreeNote = kind === 'free'
    wx.showModal({
      title: isFreeNote ? '删除这张自由笔记？' : '删除这张方法卡？',
      content: '删除后无法恢复，其中保存的本地图片也会一并清理。',
      cancelText: '保留',
      confirmText: '删除',
      confirmColor: '#e05575',
      success: result => {
        if (!result.confirm) return
        const removed = isFreeNote
          ? notebookStorage.removeNote(id)
          : methodStorage.removeMethod(id)
        if (!removed) return
        const imagePaths = isFreeNote
          ? notebookStorage.getImagePaths(removed)
          : (removed.images || []).concat(
            (removed.examples || []).reduce((paths, example) => paths.concat(example.images || []), [])
          )
        if (typeof wx.removeSavedFile === 'function') {
          imagePaths.filter(Boolean).forEach(filePath => wx.removeSavedFile({ filePath, fail() {} }))
        }
        wx.showToast({ title: '已删除', icon: 'success' })
        this.onShow()
      }
    })
  }
})
