const assert = require('assert')

let compressionOptions
let savedTempPath

global.wx = {
  compressImage(options) {
    compressionOptions = options
    options.success({ tempFilePath: 'wxfile://compressed.jpg' })
  },
  saveFile(options) {
    savedTempPath = options.tempFilePath
    options.success({ savedFilePath: 'wxfile://saved.jpg' })
  },
  getSavedFileList(options) {
    options.success({ fileList: [{ size: 1024 }, { size: 2048 }] })
  }
}

const mediaStorage = require('../miniprogram/utils/media-storage')

async function run() {
  const path = await mediaStorage.saveCompressedImage('wxfile://original.jpg')
  assert.strictEqual(path, 'wxfile://saved.jpg')
  assert.strictEqual(savedTempPath, 'wxfile://compressed.jpg')
  assert.strictEqual(compressionOptions.quality, 72)
  assert.strictEqual(compressionOptions.compressedWidth, 1600)
  assert.strictEqual(await mediaStorage.getSavedFileBytes(), 3072)
  assert.strictEqual(mediaStorage.formatBytes(1024), '1.0 KB')
  console.log('media-storage.test.js: OK')
}

run().catch(error => {
  console.error(error)
  process.exitCode = 1
})
