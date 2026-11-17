const methodStorage = require('../../utils/method-storage')

function snippet(value) {
  const content = String(value || '').trim()
  return content.length > 70 ? `${content.slice(0, 70)}…` : content
}

function dateText(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

Page({
  data: {
    methods: [],
    methodCount: 0,
    categories: [],
    selectedCategory: '全部',
    keyword: ''
  },

  onShow() {
    this.allMethods = methodStorage.getMethods().map(method => ({
      ...method,
      summary: snippet(method.recognition || method.steps || method.notes) || '还没有补充方法说明',
      dateText: dateText(method.updatedAt),
      exampleCount: (method.examples || []).length,
      imageCount: (method.images || []).length + (method.examples || []).reduce(
        (count, example) => count + (example.images || []).length,
        0
      )
    }))
    const counts = this.allMethods.reduce((result, method) => {
      result[method.category] = (result[method.category] || 0) + 1
      return result
    }, {})
    const categories = [{ name: '全部', count: this.allMethods.length }].concat(
      Object.keys(counts).sort().map(name => ({ name, count: counts[name] }))
    )
    const selectedCategory = categories.some(item => item.name === this.data.selectedCategory)
      ? this.data.selectedCategory
      : '全部'
    this.setData({ categories, methodCount: this.allMethods.length, selectedCategory })
    this.applyFilters(selectedCategory, this.data.keyword)
  },

  applyFilters(category, keyword) {
    const normalizedKeyword = String(keyword || '').trim().toLowerCase()
    const methods = (this.allMethods || []).filter(method => {
      if (category !== '全部' && method.category !== category) return false
      if (!normalizedKeyword) return true
      const searchable = [
        method.title, method.category, method.recognition, method.steps,
        method.pitfalls, method.notes, ...(method.tags || [])
      ].join(' ').toLowerCase()
      return searchable.includes(normalizedKeyword)
    })
    this.setData({ methods, selectedCategory: category, keyword })
  },

  search(event) { this.applyFilters(this.data.selectedCategory, event.detail.value) },

  selectCategory(event) { this.applyFilters(event.currentTarget.dataset.name, this.data.keyword) },

  createMethod() { wx.navigateTo({ url: '/pages/method-editor/method-editor' }) },

  createFromImage() { wx.navigateTo({ url: '/pages/method-editor/method-editor?external=1' }) },

  editMethod(event) {
    wx.navigateTo({ url: `/pages/method-editor/method-editor?id=${event.currentTarget.dataset.id}` })
  }
})
