const DATA_ROOT = 'yijuan-document-data-v2'

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function byteLength(value) {
  const content = typeof value === 'string' ? value : JSON.stringify(value || '')
  try {
    return unescape(encodeURIComponent(content)).length
  } catch (error) {
    return content.length * 2
  }
}

function safeId(id) {
  return String(id || '').replace(/[^a-zA-Z0-9_-]/g, '_')
}

function storageError(error) {
  const wrapped = new Error('本机存储空间不足或文件写入失败')
  wrapped.code = 'LOCAL_DOCUMENT_WRITE_FAILED'
  wrapped.userMessage = '笔记保存失败，请清理本机空间后重试'
  wrapped.originalError = error
  return wrapped
}

function createJsonDocumentStore(options) {
  const {
    legacyKey,
    indexFile,
    directory,
    summarize
  } = options
  let indexCache = null
  const documentCache = Object.create(null)

  function fileSystemAvailable() {
    return Boolean(
      wx
      && wx.env
      && wx.env.USER_DATA_PATH
      && typeof wx.getFileSystemManager === 'function'
    )
  }

  function paths() {
    const root = `${wx.env.USER_DATA_PATH}/${DATA_ROOT}`
    return {
      root,
      documents: `${root}/${directory}`,
      index: `${root}/${indexFile}`
    }
  }

  function ensureDirectory(fileSystem, path) {
    try {
      fileSystem.accessSync(path)
      return
    } catch (error) {}
    fileSystem.mkdirSync(path, true)
  }

  function ensureFileSystem() {
    const fileSystem = wx.getFileSystemManager()
    const resolved = paths()
    ensureDirectory(fileSystem, resolved.root)
    ensureDirectory(fileSystem, resolved.documents)
    return { fileSystem, ...resolved }
  }

  function readJson(fileSystem, path, fallback) {
    try {
      const content = fileSystem.readFileSync(path, 'utf8')
      return JSON.parse(content)
    } catch (error) {
      return fallback
    }
  }

  function writeJson(fileSystem, path, value) {
    fileSystem.writeFileSync(path, JSON.stringify(value), 'utf8')
  }

  function documentPath(documents, id) {
    return `${documents}/${safeId(id)}.json`
  }

  function legacyDocuments() {
    const stored = wx.getStorageSync(legacyKey)
    return Array.isArray(stored) ? stored : []
  }

  function summaryFor(document) {
    const content = JSON.stringify(document)
    return {
      ...summarize(document),
      id: document.id,
      byteSize: byteLength(content)
    }
  }

  function migrateLegacyDocuments(fileSystem, resolvedPaths) {
    const documents = legacyDocuments()
    if (!documents.length) {
      writeJson(fileSystem, resolvedPaths.index, [])
      return []
    }
    const summaries = []
    documents.forEach(document => {
      writeJson(fileSystem, documentPath(resolvedPaths.documents, document.id), document)
      documentCache[document.id] = document
      summaries.push(summaryFor(document))
    })
    writeJson(fileSystem, resolvedPaths.index, summaries)
    wx.removeStorageSync(legacyKey)
    return summaries
  }

  function loadIndex() {
    if (indexCache) return indexCache
    if (!fileSystemAvailable()) {
      const documents = legacyDocuments()
      documents.forEach(document => { documentCache[document.id] = document })
      indexCache = documents.map(summaryFor)
      return indexCache
    }

    const resolved = ensureFileSystem()
    const storedIndex = readJson(resolved.fileSystem, resolved.index, null)
    if (Array.isArray(storedIndex)) {
      indexCache = storedIndex
      return indexCache
    }
    try {
      indexCache = migrateLegacyDocuments(resolved.fileSystem, resolved)
      return indexCache
    } catch (error) {
      throw storageError(error)
    }
  }

  function sortedSummaries() {
    return loadIndex().slice().sort((left, right) => (right.updatedAt || 0) - (left.updatedAt || 0))
  }

  function get(id) {
    loadIndex()
    if (documentCache[id]) return clone(documentCache[id])
    if (!indexCache.some(item => item.id === id)) return null
    if (!fileSystemAvailable()) return null
    const resolved = ensureFileSystem()
    const document = readJson(resolved.fileSystem, documentPath(resolved.documents, id), null)
    if (document) documentCache[id] = document
    return clone(document)
  }

  function list() {
    return sortedSummaries().map(item => get(item.id)).filter(Boolean)
  }

  function listSummaries() {
    return clone(sortedSummaries())
  }

  function save(document) {
    const summaries = loadIndex()
    const summary = summaryFor(document)
    const nextIndex = [summary].concat(summaries.filter(item => item.id !== document.id))

    try {
      if (fileSystemAvailable()) {
        const resolved = ensureFileSystem()
        writeJson(resolved.fileSystem, documentPath(resolved.documents, document.id), document)
        writeJson(resolved.fileSystem, resolved.index, nextIndex)
      } else {
        const documents = list()
        wx.setStorageSync(legacyKey, [document].concat(documents.filter(item => item.id !== document.id)))
      }
    } catch (error) {
      throw storageError(error)
    }

    documentCache[document.id] = document
    indexCache = nextIndex
    return clone(document)
  }

  function remove(id) {
    const document = get(id)
    if (!document) return null
    const nextIndex = loadIndex().filter(item => item.id !== id)

    try {
      if (fileSystemAvailable()) {
        const resolved = ensureFileSystem()
        writeJson(resolved.fileSystem, resolved.index, nextIndex)
        try {
          resolved.fileSystem.unlinkSync(documentPath(resolved.documents, id))
        } catch (error) {}
      } else {
        const documents = list().filter(item => item.id !== id)
        if (documents.length) wx.setStorageSync(legacyKey, documents)
        else wx.removeStorageSync(legacyKey)
      }
    } catch (error) {
      throw storageError(error)
    }

    delete documentCache[id]
    indexCache = nextIndex
    return document
  }

  function estimatedBytes() {
    const summaries = loadIndex()
    return summaries.reduce((total, item) => total + (Number(item.byteSize) || 0), 0)
      + byteLength(summaries)
  }

  return { get, list, listSummaries, save, remove, estimatedBytes }
}

module.exports = { createJsonDocumentStore, byteLength }
