const { DEFAULT_EXAM_TYPE } = require('../data/exam-types')

function getRecordScore(record) {
  const value = record?.result?.trainingScore ?? record?.trainingScore
  return Number.isFinite(Number(value)) ? Number(value) : null
}

function getPaperExamType(paper) {
  return paper?.examType || DEFAULT_EXAM_TYPE
}

function getPaperDisplayTitle(paper) {
  if (paper?.displayTitle) return paper.displayTitle
  return String(paper?.title || '').replace(/^\d{4}\s*/, '')
}

function buildExamTypeOptions(papers, definitions) {
  const counts = papers.reduce((result, paper) => {
    const examType = getPaperExamType(paper)
    result[examType] = (result[examType] || 0) + 1
    return result
  }, {})
  return [
    { value: 'all', label: '全部考试', count: papers.length },
    ...definitions.map(item => ({ ...item, count: counts[item.value] || 0 }))
  ]
}

function buildYearOptions(papers) {
  const counts = papers.reduce((result, paper) => {
    const year = String(paper.year)
    result[year] = (result[year] || 0) + 1
    return result
  }, {})
  const years = Object.keys(counts).sort((left, right) => Number(right) - Number(left))
  return [
    { value: 'all', label: '全部', count: papers.length },
    ...years.map(year => ({ value: year, label: year, count: counts[year] }))
  ]
}

function filterPapersByYear(papers, selectedYear) {
  const year = String(selectedYear || 'all')
  return year === 'all' ? papers : papers.filter(paper => String(paper.year) === year)
}

function filterPapers(papers, filters = {}) {
  const examType = filters.examType || 'all'
  const byExamType = examType === 'all'
    ? papers
    : papers.filter(paper => getPaperExamType(paper) === examType)
  return filterPapersByYear(byExamType, filters.year)
}

function sortPapersByYearDesc(papers) {
  return papers
    .map((paper, index) => ({ paper, index }))
    .sort((left, right) => Number(right.paper.year) - Number(left.paper.year) || left.index - right.index)
    .map(item => item.paper)
}

module.exports = {
  buildExamTypeOptions,
  buildYearOptions,
  filterPapers,
  filterPapersByYear,
  getPaperDisplayTitle,
  getPaperExamType,
  getRecordScore,
  sortPapersByYearDesc
}

