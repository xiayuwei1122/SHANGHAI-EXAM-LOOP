const assert = require('assert')
const { buildYearOptions, filterPapersByYear, getRecordScore } = require('../miniprogram/utils/paper-filter')

const papers = [
  { id: '2025-a', year: 2025 },
  { id: '2025-b', year: 2025 },
  { id: '2023-a', year: 2023 }
]

assert.deepStrictEqual(buildYearOptions(papers), [
  { value: 'all', label: '全部', count: 3 },
  { value: '2025', label: '2025', count: 2 },
  { value: '2023', label: '2023', count: 1 }
])
assert.deepStrictEqual(filterPapersByYear(papers, '2025').map(item => item.id), ['2025-a', '2025-b'])
assert.strictEqual(filterPapersByYear(papers, 'all').length, 3)
assert.strictEqual(getRecordScore({ result: { trainingScore: 88 } }), 88)
assert.strictEqual(getRecordScore({ trainingScore: 76 }), 76)
assert.strictEqual(getRecordScore({ result: {} }), null)

console.log('paper-filter.test.js: OK')

