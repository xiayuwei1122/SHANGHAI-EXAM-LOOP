const methodStorage = require('../../utils/method-storage')

const EMPTY_FORM = {
  id: '',
  title: '',
  category: '',
  content: '',
  recognition: '',
  steps: '',
  pitfalls: '',
  notes: '',
  tagsText: '',
  examples: [],
  images: [],
  createdAt: 0
}

const EMPTY_EXTERNAL = { content: '', images: [] }

function clean(value) { return typeof value === 'string' ? value.trim() : '' }

function legacyMethodContent(source) {
  if (clean(source?.content)) return clean(source.content)
  return [
    ['识别信号', source?.recognition],
    ['解题步骤', source?.steps],
    ['易错点', source?.pitfalls],
    ['我的补充', source?.notes]
  ].filter(([, value]) => clean(value))
    .map(([label, value]) => `${label}\n${clean(value)}`)
    .join('\n\n')
}

function externalQuestionContent(example) {
  if (clean(example?.content)) return clean(example.content)
  return [
    clean(example?.paperTitle) && example.paperTitle !== '外部题目' ? `来源：${clean(example.paperTitle)}` : '',
    clean(example?.stem) ? `题目：\n${clean(example.stem)}` : '',
    clean(example?.answer) ? `参考答案：${clean(example.answer)}` : '',
    clean(example?.explanation) ? `解析：\n${clean(example.explanation)}` : ''
  ].filter(Boolean).join('\n\n')
}

function normalizeExample(example) {
  if (example?.sourceType !== 'external') return example
  return { ...example, content: externalQuestionContent(example), images: example.images || [] }
}

Page({
  data: {
    form: { ...EMPTY_FORM },
    isEditing: false,
    categoryPresets: ['资料分析', '数量关系', '判断推理', '言语理解', '常识判断', '政治理论'],
    showExternalEditor: false,
    externalForm: { ...EMPTY_EXTERNAL },
    externalOnReady: false
  },

  onLoad(options) {
    let source = null
    if (options.id) source = methodStorage.getMethod(options.id)
    else source = methodStorage.consumePrefill()
    const form = source ? {
      ...EMPTY_FORM,
      ...source,
      content: legacyMethodContent(source),
      tagsText: (source.tags || []).join('，'),
      examples: (source.examples || []).map(normalizeExample),
      images: source.images || []
    } : { ...EMPTY_FORM }
    this.setData({ form, isEditing: Boolean(options.id), externalOnReady: options.external === '1' })
    wx.setNavigationBarTitle({ title: options.id ? '编辑方法卡' : '新建方法卡' })
  },

  onReady() {
    if (!this.data.externalOnReady) return
    this.setData({ externalOnReady: false, showExternalEditor: true, externalForm: { ...EMPTY_EXTERNAL } })
    this.chooseExternalImages()
  },

  inputField(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: event.detail.value })
  },

  selectCategory(event) { this.setData({ 'form.category': event.currentTarget.dataset.name }) },

  inputExternal(event) {
    const field = event.currentTarget.dataset.field
    this.setData({ [`externalForm.${field}`]: event.detail.value })
  },

  startExternal() {
    this.setData({ showExternalEditor: true, externalForm: { ...EMPTY_EXTERNAL } })
  },

  cancelExternal() {
    this.cleanupImages(this.data.externalForm.images)
    this.setData({ showExternalEditor: false, externalForm: { ...EMPTY_EXTERNAL } })
  },

  chooseImages() {
    const remaining = Math.max(0, 3 - this.data.form.images.length)
    if (!remaining) {
      wx.showToast({ title: '最多添加 3 张图片', icon: 'none' })
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
        if (saved.length) this.setData({ 'form.images': this.data.form.images.concat(saved) })
      },
      fail: error => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '图片选择失败', icon: 'none' })
      }
    })
  },

  chooseExternalImages() {
    const remaining = Math.max(0, 3 - this.data.externalForm.images.length)
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
        if (saved.length) {
          this.setData({ 'externalForm.images': this.data.externalForm.images.concat(saved) })
        }
      },
      fail: error => {
        if (!String(error.errMsg || '').includes('cancel')) wx.showToast({ title: '图片选择失败', icon: 'none' })
      }
    })
  },

  persistImage(tempFilePath) {
    return new Promise(resolve => {
      wx.saveFile({
        tempFilePath,
        success: result => resolve(result.savedFilePath),
        fail: () => {
          wx.showToast({ title: '图片保存失败', icon: 'none' })
          resolve('')
        }
      })
    })
  },

  previewImage(event) {
    wx.previewImage({ current: event.currentTarget.dataset.src, urls: this.data.form.images })
  },

  previewExampleImage(event) {
    const example = this.data.form.examples[Number(event.currentTarget.dataset.example)]
    const images = example?.images || []
    const current = images[Number(event.currentTarget.dataset.image)]
    if (current) wx.previewImage({ current, urls: images })
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const path = this.data.form.images[index]
    wx.showModal({
      title: '删除这张图片？',
      success: result => {
        if (!result.confirm) return
        const images = this.data.form.images.filter((item, imageIndex) => imageIndex !== index)
        this.setData({ 'form.images': images })
        if (path) wx.removeSavedFile({ filePath: path, fail() {} })
      }
    })
  },

  removeExternalImage(event) {
    const index = Number(event.currentTarget.dataset.index)
    const path = this.data.externalForm.images[index]
    const images = this.data.externalForm.images.filter((item, imageIndex) => imageIndex !== index)
    this.setData({ 'externalForm.images': images })
    this.cleanupImages(path ? [path] : [])
  },

  addExternalExample() {
    const external = this.data.externalForm
    if (!external.content.trim() && !external.images.length) {
      wx.showToast({ title: '请填写题目内容或添加图片', icon: 'none' })
      return
    }
    const example = {
      id: `external-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sourceType: 'external',
      paperTitle: '外部题目',
      number: '',
      moduleName: '外部导入',
      type: '',
      content: external.content.trim(),
      stem: '',
      answer: '',
      explanation: '',
      userAnswer: '',
      images: external.images.slice()
    }
    this.setData({
      'form.examples': this.data.form.examples.concat(example),
      showExternalEditor: false,
      externalForm: { ...EMPTY_EXTERNAL }
    })
  },

  removeExample(event) {
    const index = Number(event.currentTarget.dataset.index)
    const example = this.data.form.examples[index]
    wx.showModal({
      title: '移除这道典型题？',
      content: example?.sourceType === 'external' ? '外部题目的文字和图片都会移除。' : '只会解除关联，不影响原试卷。',
      confirmText: '移除',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        this.cleanupImages(example?.images || [])
        this.setData({
          'form.examples': this.data.form.examples.filter((item, exampleIndex) => exampleIndex !== index)
        })
      }
    })
  },

  cleanupImages(images) {
    const paths = images || []
    paths.forEach(path => wx.removeSavedFile({ filePath: path, fail() {} }))
  },

  save() {
    if (!this.data.form.title.trim()) {
      wx.showToast({ title: '先给方法起个标题', icon: 'none' })
      return
    }
    const method = methodStorage.saveMethod({
      ...this.data.form,
      tags: this.data.form.tagsText
    })
    this.setData({ 'form.id': method.id })
    wx.showToast({ title: '方法卡已保存', icon: 'success' })
    wx.navigateBack({ delta: 1 })
  },

  remove() {
    wx.showModal({
      title: '删除这张方法卡？',
      content: '方法说明和图片附件都会删除，且无法恢复。',
      confirmText: '删除',
      confirmColor: '#a64132',
      success: result => {
        if (!result.confirm) return
        const removed = methodStorage.removeMethod(this.data.form.id)
        const images = (removed?.images || []).concat(
          (removed?.examples || []).reduce((paths, example) => paths.concat(example.images || []), [])
        )
        this.cleanupImages(images)
        wx.showToast({ title: '已删除', icon: 'success' })
        wx.navigateBack({ delta: 1 })
      }
    })
  }
})
