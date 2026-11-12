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
  wx.setStorageSync(RECORD_PREFIX + record.id, record)
  wx.setStorageSync(HISTORY_KEY, [summary].concat(history.filter(item => item.id !== record.id)).slice(0, 60))
}

function getRecord(id) { return wx.getStorageSync(RECORD_PREFIX + id) || null }
function getHistory() { return wx.getStorageSync(HISTORY_KEY) || [] }

module.exports = { getDraft, saveDraft, clearDraft, saveRecord, getRecord, getHistory }
