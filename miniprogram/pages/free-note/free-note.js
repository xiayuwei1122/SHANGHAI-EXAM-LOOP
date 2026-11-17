const notebookStorage = require('../../utils/notebook-storage')
const mediaStorage = require('../../utils/media-storage')

const DEFAULT_CATEGORY = '随手记'
const COLORS = ['#27273f', '#f0527e', '#ff9d3d', '#2eac83', '#4d86e8', '#7467ef']
const WIDTHS = [3, 6, 11]

function clone(value) { return JSON.parse(JSON.stringify(value)) }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max) }
function round(value) { return Math.round(value * 10000) / 10000 }
function elementId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }

Page({
  data: {
    id: '',
    title: '',
    category: DEFAULT_CATEGORY,
    background: 'grid',
    backgroundOptions: [
      { value: 'blank', label: '空白' },
      { value: 'grid', label: '方格' },
      { value: 'lined', label: '横线' },
      { value: 'dots', label: '点阵' }
    ],
    tools: [
      { value: 'pen', icon: '✎', label: '笔' },
      { value: 'marker', icon: '▰', label: '荧光' },
      { value: 'eraser', icon: '◇', label: '橡皮' },
      { value: 'select', icon: '↖', label: '移动' }
    ],
    colors: COLORS,
    widths: WIDTHS,
    selectedTool: 'pen',
    selectedColor: COLORS[0],
    selectedWidth: WIDTHS[0],
    selectedElementId: '',
    hasSelection: false,
    canUndo: false,
    canRedo: false,
    elementCount: 0,
    isEditing: false,
    showQuestionImporter: false,
    questionDraft: { content: '', images: [] }
  },

  onLoad(options) {
    const source = options.id ? notebookStorage.getNote(options.id) : null
    this.elements = clone(source?.elements || [])
    this.past = []
    this.future = []
    this.imageCache = {}
    this.originalImagePaths = notebookStorage.getImagePaths(source)
    this.dirty = false
    this.setData({
      id: source?.id || '',
      title: source?.title || '',
      category: source?.category || DEFAULT_CATEGORY,
      background: source?.background || 'grid',
      elementCount: this.elements.length,
      isEditing: Boolean(source)
    })
    wx.setNavigationBarTitle({ title: source ? '编辑自由笔记' : '新建自由笔记' })
  },

  onReady() { this.initCanvas() },

  onHide() { this.autoSave() },

  onUnload() {
    this.autoSave()
    this.cleanupQuestionDraft()
  },

  initCanvas() {
    wx.createSelectorQuery().select('#freeCanvas').fields({ node: true, size: true }).exec(result => {
      const canvasInfo = result[0]
      if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) return
      const system = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
      const dpr = system.pixelRatio || 1
      this.canvas = canvasInfo.node
      this.context = this.canvas.getContext('2d')
      this.canvasWidth = canvasInfo.width
      this.canvasHeight = canvasInfo.height
      this.dpr = dpr
      this.canvas.width = Math.round(canvasInfo.width * dpr)
      this.canvas.height = Math.round(canvasInfo.height * dpr)
      this.renderCanvas()
    })
  },

  inputMeta(event) {
    this.dirty = true
    this.setData({ [event.currentTarget.dataset.field]: event.detail.value })
  },

  setTool(event) {
    const selectedTool = event.currentTarget.dataset.tool
    this.dragState = null
    this.setData({
      selectedTool,
      selectedElementId: selectedTool === 'select' ? this.data.selectedElementId : '',
      hasSelection: selectedTool === 'select' && Boolean(this.data.selectedElementId)
    })
    this.renderCanvas()
  },

  setColor(event) {
    const selectedColor = event.currentTarget.dataset.color
    this.setData({ selectedColor })
    const selected = this.findSelected()
    if (selected && selected.type === 'text') {
      this.checkpoint()
      selected.color = selectedColor
      this.dirty = true
      this.renderCanvas()
    }
  },

  setWidth(event) { this.setData({ selectedWidth: Number(event.currentTarget.dataset.width) }) },

  setBackground(event) {
    this.dirty = true
    this.setData({ background: event.currentTarget.dataset.background })
    this.renderCanvas()
  },

  getPoint(event) {
    const touch = event.touches?.[0] || event.changedTouches?.[0]
    if (!touch || !this.canvasWidth || !this.canvasHeight) return null
    return {
      x: round(clamp(touch.x / this.canvasWidth, 0, 1)),
      y: round(clamp(touch.y / this.canvasHeight, 0, 1))
    }
  },

  touchStart(event) {
    const point = this.getPoint(event)
    if (!point || !this.context) return
    if (this.data.selectedTool === 'pen' || this.data.selectedTool === 'marker') {
      this.checkpoint()
      const stroke = {
        id: elementId('stroke'),
        type: 'stroke',
        tool: this.data.selectedTool,
        color: this.data.selectedColor,
        width: this.data.selectedWidth,
        points: [point]
      }
      this.elements.push(stroke)
      this.activeStroke = stroke
      this.dirty = true
      this.renderCanvas()
      return
    }
    if (this.data.selectedTool === 'eraser') {
      this.eraseGestureStarted = false
      this.eraseAt(point)
      return
    }
    if (this.data.selectedTool === 'select') {
      const selected = this.hitElement(point)
      if (!selected) {
        this.dragState = null
        this.setData({ selectedElementId: '', hasSelection: false })
        this.renderCanvas()
        return
      }
      this.checkpoint()
      this.dragState = { id: selected.id, offsetX: point.x - selected.x, offsetY: point.y - selected.y }
      this.setData({ selectedElementId: selected.id, hasSelection: true })
      this.renderCanvas()
    }
  },

  touchMove(event) {
    const point = this.getPoint(event)
    if (!point) return
    if (this.activeStroke) {
      const last = this.activeStroke.points[this.activeStroke.points.length - 1]
      const dx = (point.x - last.x) * this.canvasWidth
      const dy = (point.y - last.y) * this.canvasHeight
      if (Math.sqrt(dx * dx + dy * dy) >= 2) {
        this.activeStroke.points.push(point)
        this.renderCanvas()
      }
      return
    }
    if (this.data.selectedTool === 'eraser') {
      this.eraseAt(point)
      return
    }
    if (this.dragState) {
      const element = this.elements.find(item => item.id === this.dragState.id)
      if (!element) return
      element.x = round(clamp(point.x - this.dragState.offsetX, 0, 1 - (element.width || 0.12)))
      element.y = round(clamp(point.y - this.dragState.offsetY, 0, 1 - (element.height || 0.06)))
      this.dirty = true
      this.renderCanvas()
    }
  },

  touchEnd() {
    this.activeStroke = null
    this.dragState = null
    this.eraseGestureStarted = false
    this.refreshState()
  },

  touchCancel() { this.touchEnd() },

  eraseAt(point) {
    const threshold = 18
    const index = this.elements.findIndex(element => element.type === 'stroke' && element.points.some(item => {
      const dx = (item.x - point.x) * this.canvasWidth
      const dy = (item.y - point.y) * this.canvasHeight
      return Math.sqrt(dx * dx + dy * dy) < threshold
    }))
    if (index < 0) return
    if (!this.eraseGestureStarted) {
      this.checkpoint()
      this.eraseGestureStarted = true
    }
    this.elements.splice(index, 1)
    this.dirty = true
    this.renderCanvas()
    this.refreshState()
  },

  addText() {
    wx.showModal({
      title: '添加一段文字',
      editable: true,
      placeholderText: '写下公式、口诀或自己的想法',
      confirmText: '放到画布',
      success: result => {
        const content = String(result.content || '').trim()
        if (!result.confirm || !content) return
        this.checkpoint()
        const count = this.elements.filter(item => item.type === 'text').length
        const element = {
          id: elementId('text'),
          type: 'text',
          text: content,
          x: 0.08,
          y: round(0.08 + (count % 7) * 0.1),
          width: 0.55,
          height: 0.09,
          fontSize: 0.042,
          color: this.data.selectedColor
        }
        this.elements.push(element)
        this.dirty = true
        this.setData({ selectedTool: 'select', selectedElementId: element.id, hasSelection: true })
        this.refreshState()
        this.renderCanvas()
      }
    })
  },

  startQuestionImport() {
    if (this.data.showQuestionImporter) return
    this.setData({ showQuestionImporter: true, questionDraft: { content: '', images: [] } })
  },

  inputQuestionDraft(event) {
    this.setData({
      questionDraft: { ...this.data.questionDraft, content: event.detail.value }
    })
  },

  chooseQuestionImages() {
    const remaining = Math.max(0, 3 - this.data.questionDraft.images.length)
    if (!remaining) {
      wx.showToast({ title: '一道题最多添加 3 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async result => {
        const saved = []
        for (const file of result.tempFiles || []) {
          const path = await this.persistImage(file.tempFilePath)
          if (path) saved.push(path)
        }
        if (!saved.length) return
        this.setData({
          questionDraft: {
            ...this.data.questionDraft,
            images: this.data.questionDraft.images.concat(saved)
          }
        })
      },
      fail: error => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '图片选择失败', icon: 'none' })
      }
    })
  },

  persistImage(tempFilePath) {
    return mediaStorage.saveCompressedImage(tempFilePath).catch(error => {
      wx.showToast({ title: error.userMessage || '图片保存失败', icon: 'none' })
      return ''
    })
  },

  previewQuestionImage(event) {
    const images = this.data.questionDraft.images
    const current = images[Number(event.currentTarget.dataset.index)]
    if (current) wx.previewImage({ current, urls: images })
  },

  removeQuestionImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const path = this.data.questionDraft.images[index]
    const images = this.data.questionDraft.images.filter((item, imageIndex) => imageIndex !== index)
    this.setData({ questionDraft: { ...this.data.questionDraft, images } })
    if (path) wx.removeSavedFile({ filePath: path, fail() {} })
  },

  cleanupQuestionDraft() {
    ;(this.data.questionDraft?.images || []).forEach(filePath => {
      wx.removeSavedFile({ filePath, fail() {} })
    })
  },

  cancelQuestionImport() {
    this.cleanupQuestionDraft()
    this.setData({ showQuestionImporter: false, questionDraft: { content: '', images: [] } })
  },

  addExternalQuestion() {
    const content = String(this.data.questionDraft.content || '').trim()
    const images = this.data.questionDraft.images.slice()
    if (!content && !images.length) {
      wx.showToast({ title: '请填写题目内容或添加图片', icon: 'none' })
      return
    }
    this.checkpoint()
    const movableCount = this.elements.filter(item => item.type === 'text' || item.type === 'image').length
    const baseY = round(clamp(0.07 + (movableCount % 5) * 0.06, 0.07, 0.38))
    if (content) {
      this.elements.push({
        id: elementId('question'),
        type: 'text',
        kind: 'question',
        text: content,
        x: 0.06,
        y: baseY,
        width: 0.88,
        height: 0.2,
        fontSize: 0.033,
        color: '#27273f'
      })
    }
    images.forEach((path, index) => {
      this.elements.push({
        id: elementId('image'),
        type: 'image',
        path,
        x: round(0.12 + index * 0.05),
        y: round(clamp(baseY + (content ? 0.23 : 0) + index * 0.06, 0.08, 0.68)),
        width: 0.7,
        height: 0.28
      })
    })
    const selected = this.elements[this.elements.length - 1]
    this.dirty = true
    this.setData({
      showQuestionImporter: false,
      questionDraft: { content: '', images: [] },
      selectedTool: 'select',
      selectedElementId: selected?.id || '',
      hasSelection: Boolean(selected)
    })
    this.refreshState()
    this.renderCanvas()
    wx.showToast({ title: '题目已放到画布', icon: 'success' })
  },

  chooseImage() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async result => {
        const tempFilePath = result.tempFiles?.[0]?.tempFilePath
        if (!tempFilePath) return
        const path = await this.persistImage(tempFilePath)
        if (path) this.addSavedImage(path)
      },
      fail: error => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '图片选择失败', icon: 'none' })
      }
    })
  },

  addSavedImage(path) {
    wx.getImageInfo({
      src: path,
      success: info => this.insertImage(path, info.width, info.height),
      fail: () => this.insertImage(path, 4, 3)
    })
  },

  insertImage(path, sourceWidth, sourceHeight) {
    this.checkpoint()
    const width = 0.62
    const height = clamp(width * (sourceHeight / sourceWidth) * (this.canvasWidth / this.canvasHeight), 0.16, 0.58)
    const element = {
      id: elementId('image'), type: 'image', path,
      x: 0.19, y: 0.12, width: round(width), height: round(height)
    }
    this.elements.push(element)
    this.dirty = true
    this.setData({ selectedTool: 'select', selectedElementId: element.id, hasSelection: true })
    this.refreshState()
    this.renderCanvas()
  },

  scaleSelected(event) {
    const element = this.findSelected()
    if (!element) return
    this.checkpoint()
    const factor = event.currentTarget.dataset.direction === 'up' ? 1.14 : 0.86
    if (element.type === 'image') {
      element.width = round(clamp(element.width * factor, 0.18, 0.9))
      element.height = round(clamp(element.height * factor, 0.1, 0.75))
    } else if (element.type === 'text') {
      element.fontSize = round(clamp(element.fontSize * factor, 0.025, 0.085))
      element.width = round(clamp(element.width * factor, 0.25, 0.86))
    }
    this.dirty = true
    this.renderCanvas()
    this.refreshState()
  },

  deleteSelected() {
    const selected = this.findSelected()
    if (!selected) return
    wx.showModal({
      title: selected.type === 'image' ? '移除这张图片？' : selected.kind === 'question' ? '移除这道题目？' : '移除这段文字？',
      confirmText: '移除',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        this.checkpoint()
        this.elements = this.elements.filter(item => item.id !== selected.id)
        this.dirty = true
        this.setData({ selectedElementId: '', hasSelection: false })
        this.refreshState()
        this.renderCanvas()
      }
    })
  },

  clearCanvas() {
    if (!this.elements.length) return
    wx.showModal({
      title: '清空整张画布？',
      content: '可以立即撤销；保存并离开后将无法恢复。',
      confirmText: '清空',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        this.checkpoint()
        this.elements = []
        this.dirty = true
        this.setData({ selectedElementId: '', hasSelection: false })
        this.refreshState()
        this.renderCanvas()
      }
    })
  },

  checkpoint() {
    this.past.push(clone(this.elements))
    if (this.past.length > 30) this.past.shift()
    this.future = []
    this.refreshHistoryButtons()
  },

  undo() {
    if (!this.past.length) return
    this.future.push(clone(this.elements))
    this.elements = this.past.pop()
    this.dirty = true
    this.setData({ selectedElementId: '', hasSelection: false })
    this.refreshState()
    this.renderCanvas()
  },

  redo() {
    if (!this.future.length) return
    this.past.push(clone(this.elements))
    this.elements = this.future.pop()
    this.dirty = true
    this.setData({ selectedElementId: '', hasSelection: false })
    this.refreshState()
    this.renderCanvas()
  },

  refreshHistoryButtons() { this.setData({ canUndo: Boolean(this.past.length), canRedo: Boolean(this.future.length) }) },

  refreshState() {
    this.setData({ elementCount: this.elements.length })
    this.refreshHistoryButtons()
  },

  findSelected() { return this.elements.find(item => item.id === this.data.selectedElementId) || null },

  hitElement(point) {
    return this.elements.slice().reverse().find(element => {
      if (element.type !== 'text' && element.type !== 'image') return false
      return point.x >= element.x && point.x <= element.x + element.width
        && point.y >= element.y && point.y <= element.y + (element.height || 0.1)
    }) || null
  },

  renderCanvas() {
    if (!this.context || !this.canvasWidth || !this.canvasHeight) return
    const ctx = this.context
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.drawBackground(ctx)
    this.elements.forEach(element => {
      if (element.type === 'stroke') this.drawStroke(ctx, element)
      else if (element.type === 'text') this.drawText(ctx, element)
      else if (element.type === 'image') this.drawImage(ctx, element)
    })
  },

  drawBackground(ctx) {
    const style = this.data.background
    if (style === 'blank') return
    ctx.save()
    ctx.strokeStyle = style === 'lined' ? '#e5e7f3' : '#e9ebf5'
    ctx.fillStyle = '#d9dceb'
    ctx.lineWidth = 0.7
    const gap = this.canvasWidth / 14
    if (style === 'lined') {
      for (let y = gap; y < this.canvasHeight; y += gap) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke()
      }
    } else if (style === 'grid') {
      for (let x = gap; x < this.canvasWidth; x += gap) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.canvasHeight); ctx.stroke()
      }
      for (let y = gap; y < this.canvasHeight; y += gap) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.canvasWidth, y); ctx.stroke()
      }
    } else if (style === 'dots') {
      for (let x = gap; x < this.canvasWidth; x += gap) {
        for (let y = gap; y < this.canvasHeight; y += gap) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
        }
      }
    }
    ctx.restore()
  },

  drawStroke(ctx, stroke) {
    if (!stroke.points.length) return
    ctx.save()
    ctx.beginPath()
    ctx.strokeStyle = stroke.color
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.globalAlpha = stroke.tool === 'marker' ? 0.28 : 1
    const first = stroke.points[0]
    ctx.moveTo(first.x * this.canvasWidth, first.y * this.canvasHeight)
    stroke.points.slice(1).forEach(point => ctx.lineTo(point.x * this.canvasWidth, point.y * this.canvasHeight))
    if (stroke.points.length === 1) ctx.lineTo(first.x * this.canvasWidth + 0.1, first.y * this.canvasHeight + 0.1)
    ctx.stroke()
    ctx.restore()
  },

  wrapText(ctx, text, maxWidth) {
    const lines = []
    String(text).split('\n').forEach(paragraph => {
      let line = ''
      Array.from(paragraph || ' ').forEach(character => {
        const next = line + character
        if (line && ctx.measureText(next).width > maxWidth) {
          lines.push(line)
          line = character
        } else line = next
      })
      lines.push(line)
    })
    return lines
  },

  drawText(ctx, element) {
    const x = element.x * this.canvasWidth
    const y = element.y * this.canvasHeight
    const fontSize = element.fontSize * this.canvasWidth
    const isQuestion = element.kind === 'question'
    const padding = isQuestion ? 14 : 0
    const labelHeight = isQuestion ? fontSize * 1.55 : 0
    const maxWidth = element.width * this.canvasWidth - padding * 2
    ctx.save()
    ctx.font = `600 ${fontSize}px sans-serif`
    ctx.textBaseline = 'top'
    const lines = this.wrapText(ctx, element.text, maxWidth)
    const lineHeight = fontSize * 1.45
    const contentHeight = lineHeight * lines.length
    element.height = round(Math.max((contentHeight + labelHeight + padding * 2) / this.canvasHeight, 0.06))
    if (isQuestion) {
      const cardWidth = element.width * this.canvasWidth
      const cardHeight = element.height * this.canvasHeight
      ctx.fillStyle = '#f5f4ff'
      ctx.strokeStyle = '#d8d5ff'
      ctx.lineWidth = 1
      ctx.fillRect(x, y, cardWidth, cardHeight)
      ctx.strokeRect(x, y, cardWidth, cardHeight)
      ctx.fillStyle = '#6964e8'
      ctx.font = `700 ${fontSize * 0.82}px sans-serif`
      ctx.fillText('外部题目', x + padding, y + padding)
      ctx.font = `600 ${fontSize}px sans-serif`
    }
    ctx.fillStyle = element.color || '#27273f'
    const textX = x + padding
    const textY = y + padding + labelHeight
    lines.forEach((line, index) => ctx.fillText(line, textX, textY + index * lineHeight))
    if (element.id === this.data.selectedElementId) this.drawSelection(ctx, element)
    ctx.restore()
  },

  drawImage(ctx, element) {
    const cached = this.imageCache[element.path]
    if (cached) {
      ctx.drawImage(cached, element.x * this.canvasWidth, element.y * this.canvasHeight, element.width * this.canvasWidth, element.height * this.canvasHeight)
      if (element.id === this.data.selectedElementId) this.drawSelection(ctx, element)
      return
    }
    if (this.imageCache[element.path] === null) return
    this.imageCache[element.path] = null
    const image = this.canvas.createImage()
    image.onload = () => { this.imageCache[element.path] = image; this.renderCanvas() }
    image.onerror = () => { delete this.imageCache[element.path] }
    image.src = element.path
  },

  drawSelection(ctx, element) {
    ctx.save()
    ctx.strokeStyle = '#6964e8'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 5])
    ctx.strokeRect(
      element.x * this.canvasWidth - 4,
      element.y * this.canvasHeight - 4,
      element.width * this.canvasWidth + 8,
      (element.height || 0.08) * this.canvasHeight + 8
    )
    ctx.restore()
  },

  hasContent() {
    return this.elements.length || this.data.title.trim() || this.data.category !== DEFAULT_CATEGORY
  },

  autoSave() {
    if (this._deleted || !this.dirty || !this.hasContent()) return
    this.saveNote(true)
  },

  saveNote(silent) {
    let note
    try {
      note = notebookStorage.saveNote({
        id: this.data.id,
        title: this.data.title,
        category: this.data.category,
        background: this.data.background,
        elements: clone(this.elements)
      })
    } catch (error) {
      wx.showToast({ title: error.userMessage || '笔记保存失败', icon: 'none' })
      return null
    }
    const currentPaths = notebookStorage.getImagePaths(note)
    this.originalImagePaths.filter(path => !currentPaths.includes(path)).forEach(path => {
      wx.removeSavedFile({ filePath: path, fail() {} })
      delete this.imageCache[path]
    })
    this.originalImagePaths = currentPaths
    this.dirty = false
    this.setData({ id: note.id, title: note.title, category: note.category, isEditing: true })
    if (!silent) wx.showToast({ title: '笔记已保存', icon: 'success' })
    return note
  },

  saveAndBack() {
    if (this.saveNote(false)) wx.navigateBack({ delta: 1 })
  },

  removeNote() {
    wx.showModal({
      title: '删除这张自由笔记？',
      content: '手写内容、文字和本地图片都会删除，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        const removed = notebookStorage.removeNote(this.data.id)
        notebookStorage.getImagePaths(removed).forEach(path => wx.removeSavedFile({ filePath: path, fail() {} }))
        this._deleted = true
        wx.showToast({ title: '已删除', icon: 'success' })
        wx.navigateBack({ delta: 1 })
      }
    })
  }
})
