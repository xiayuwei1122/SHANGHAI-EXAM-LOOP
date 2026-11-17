const LOCAL_FILE_LIMIT_BYTES = 200 * 1024 * 1024
const IMAGE_QUALITY = 72
const IMAGE_MAX_WIDTH = 1600

function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0)
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(value < 10 * 1024 ? 1 : 0)} KB`
  return `${(value / 1024 / 1024).toFixed(value < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

function compressImage(src) {
  if (typeof wx.compressImage !== 'function') return Promise.resolve(src)
  return new Promise(resolve => {
    wx.compressImage({
      src,
      quality: IMAGE_QUALITY,
      compressedWidth: IMAGE_MAX_WIDTH,
      success: result => resolve(result.tempFilePath || src),
      fail: () => resolve(src)
    })
  })
}

async function saveCompressedImage(tempFilePath) {
  const compressedPath = await compressImage(tempFilePath)
  return new Promise((resolve, reject) => {
    wx.saveFile({
      tempFilePath: compressedPath,
      success: result => resolve(result.savedFilePath),
      fail: error => {
        const wrapped = new Error(String(error?.errMsg || 'image save failed'))
        wrapped.code = 'LOCAL_IMAGE_SAVE_FAILED'
        wrapped.userMessage = /limit|space|quota|maximum/i.test(wrapped.message)
          ? '本机图片空间不足，请先清理旧图片'
          : '图片保存失败，请稍后重试'
        reject(wrapped)
      }
    })
  })
}

function getSavedFileBytes() {
  const fileSystem = typeof wx.getFileSystemManager === 'function' ? wx.getFileSystemManager() : null
  const getSavedFileList = fileSystem && typeof fileSystem.getSavedFileList === 'function'
    ? fileSystem.getSavedFileList.bind(fileSystem)
    : (typeof wx.getSavedFileList === 'function' ? wx.getSavedFileList.bind(wx) : null)
  if (!getSavedFileList) return Promise.resolve(0)
  return new Promise(resolve => {
    getSavedFileList({
      success: result => resolve((result.fileList || []).reduce(
        (total, file) => total + (Number(file.size) || 0),
        0
      )),
      fail: () => resolve(0)
    })
  })
}

module.exports = {
  LOCAL_FILE_LIMIT_BYTES,
  formatBytes,
  saveCompressedImage,
  getSavedFileBytes
}
