const HISTORY_KEY = 'corn_exam_history_v1'
const RECORD_PREFIX = 'corn_exam_record_v1:'
const DRAFT_PREFIX = 'corn_exam_draft_v1:'

function draftKey(paperId, mode, moduleId) {
  return `${DRAFT_PREFIX}${paperId}:${mode}:${moduleId || 'all'}`
}

function getDraft(paperId, mode, moduleId) {
  return wx.getStorageSync(draftKey(paperId, mode, moduleId)) || null
}

function saveDraft(paperId, mode, moduleId, draft) {
  wx.setStorageSync(draftKey(paperId, mode, moduleId), draft)
}

function clearDraft(paperId, mode, moduleId) {
  wx.removeStorageSync(draftKey(paperId, mode, moduleId))
}

function saveRecord(record) {
  const history = wx.getStorageSync(HISTORY_KEY) || []
  const summary = {
    id: record.id,
    paperId: record.paperId,
    paperTitle: record.paperTitle,
    mode: record.mode,
    moduleId: record.moduleId,
    moduleName: record.moduleName,
    submittedAt: record.submittedAt,
    elapsedSeconds: record.elapsedSeconds,
    trainingScore: record.result.trainingScore,
    correct: record.result.correct,
    total: record.result.scored,
    guessed: record.result.guessed,
    guessedCorrect: record.result.guessedCorrect
  }
  const nextHistory = [summary].concat(history.filter(item => item.id !== record.id))
  wx.setStorageSync(RECORD_PREFIX + record.id, record)
  wx.setStorageSync(HISTORY_KEY, nextHistory.slice(0, 60))
  nextHistory.slice(60).forEach(item => wx.removeStorageSync(RECORD_PREFIX + item.id))
}

function getRecord(id) { return wx.getStorageSync(RECORD_PREFIX + id) || null }
function getHistory() { return wx.getStorageSync(HISTORY_KEY) || [] }

function removeRecord(id) {
  const history = getHistory().filter(item => item.id !== id)
  wx.removeStorageSync(RECORD_PREFIX + id)
  if (history.length) wx.setStorageSync(HISTORY_KEY, history)
  else wx.removeStorageSync(HISTORY_KEY)
  return history
}

function clearHistory() {
  const history = getHistory()
  history.forEach(item => wx.removeStorageSync(RECORD_PREFIX + item.id))
  wx.removeStorageSync(HISTORY_KEY)
  return history.length
}

module.exports = {
  getDraft,
  saveDraft,
  clearDraft,
  saveRecord,
  getRecord,
  getHistory,
  removeRecord,
  clearHistory
}
