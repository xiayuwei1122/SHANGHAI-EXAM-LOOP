function getRecordScore(record) {
  const value = record?.result?.trainingScore ?? record?.trainingScore
  return Number.isFinite(Number(value)) ? Number(value) : null
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

module.exports = { buildYearOptions, filterPapersByYear, getRecordScore }

