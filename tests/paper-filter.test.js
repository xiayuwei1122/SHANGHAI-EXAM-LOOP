const assert = require('assert')
const { examTypes } = require('../miniprogram/data/exam-types')
const {
  buildExamTypeOptions,
  buildYearOptions,
  filterPapers,
  filterPapersByYear,
  getPaperDisplayTitle,
  getPaperExamType,
  getRecordScore,
  sortPapersByYearDesc
} = require('../miniprogram/utils/paper-filter')

const papers = [
  { id: '2025-a', examType: 'city-exam', year: 2025, title: '2025 上海市考行测 A 类' },
  { id: '2025-b', examType: 'city-exam', year: 2025, title: '2025 上海市考行测 B 类' },
  { id: '2023-a', year: 2023, title: '2023 上海市考行测 A 类' },
  { id: '2024-institution', examType: 'public-institution', year: 2024, title: '2024 上海事业单位职测' }
]

assert.deepStrictEqual(buildExamTypeOptions(papers, examTypes).map(item => ({
  value: item.value,
  label: item.label,
  count: item.count
})), [
  { value: 'all', label: '全部考试', count: 4 },
  { value: 'city-exam', label: '市考', count: 3 },
  { value: 'public-institution', label: '事业单位', count: 1 }
])
assert.deepStrictEqual(buildYearOptions(papers), [
  { value: 'all', label: '全部', count: 4 },
  { value: '2025', label: '2025', count: 2 },
  { value: '2024', label: '2024', count: 1 },
  { value: '2023', label: '2023', count: 1 }
])
assert.deepStrictEqual(filterPapersByYear(papers, '2025').map(item => item.id), ['2025-a', '2025-b'])
assert.strictEqual(filterPapersByYear(papers, 'all').length, 4)
assert.deepStrictEqual(filterPapers(papers, {
  examType: 'city-exam',
  year: '2025'
}).map(item => item.id), ['2025-a', '2025-b'])
assert.deepStrictEqual(filterPapers(papers, {
  examType: 'public-institution',
  year: 'all'
}).map(item => item.id), ['2024-institution'])
assert.deepStrictEqual(sortPapersByYearDesc(papers).map(item => item.id), [
  '2025-a',
  '2025-b',
  '2024-institution',
  '2023-a'
])
assert.deepStrictEqual(papers.map(item => item.id), ['2025-a', '2025-b', '2023-a', '2024-institution'])
assert.strictEqual(getPaperExamType({}), 'city-exam')
assert.strictEqual(getPaperDisplayTitle(papers[0]), '上海市考行测 A 类')
assert.strictEqual(getRecordScore({ result: { trainingScore: 88 } }), 88)
assert.strictEqual(getRecordScore({ trainingScore: 76 }), 76)
assert.strictEqual(getRecordScore({ result: {} }), null)

console.log('paper-filter.test.js: OK')

