const DEFAULT_EXAM_TYPE = 'city-exam'

// Add future exam families here. The filter remains visible even before a
// family has papers, so users can understand what the library will support.
const examTypes = [
  {
    value: 'city-exam',
    label: '市考',
    emptyTitle: '还没有市考试卷',
    emptyText: '这类试卷正在整理中。'
  },
  {
    value: 'public-institution',
    label: '事业单位',
    emptyTitle: '事业单位试卷正在整理',
    emptyText: '题库结构已经预留好，导入试卷后会自动按年份展示。'
  }
]

module.exports = { DEFAULT_EXAM_TYPE, examTypes }
