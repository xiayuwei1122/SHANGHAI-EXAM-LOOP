const path = require('path')
const simulate = require('miniprogram-simulate')

const root = path.resolve(__dirname, '../miniprogram')
const paper = require('../miniprogram/packages/sh-2019-a/paper')
const componentIds = new Map()

function createWxMock() {
  const memory = new Map()
  const calls = { redirects: [], navigations: [], toasts: [], backs: [] }
  global.wx = {
    getStorageSync(key) { return memory.get(key) },
    setStorageSync(key, value) { memory.set(key, value) },
    removeStorageSync(key) { memory.delete(key) },
    pageScrollTo() {},
    showModal(options) { if (options.success) options.success({ confirm: true, cancel: false }) },
    redirectTo(options) { calls.redirects.push(options.url) },
    navigateTo(options) { calls.navigations.push(options.url) },
    reLaunch(options) { calls.redirects.push(options.url) },
    navigateBack(options) { calls.backs.push(options.delta) },
    showToast(options) { calls.toasts.push(options) }
  }
  return { memory, calls }
}

function mount(componentPath) {
  if (!componentIds.has(componentPath)) {
    componentIds.set(componentPath, simulate.load(path.join(root, componentPath), { rootPath: root, compiler: 'simulate' }))
  }
  const id = componentIds.get(componentPath)
  const component = simulate.render(id)
  const parent = document.createElement('parent-wrapper')
  component.attach(parent)
  return component
}

test('module attempt marks a guess, scores it, and opens review', () => {
  const { memory, calls } = createWxMock()
  const exam = mount('components/exam-runner/exam-runner')
  exam.instance.init(paper, { mode: 'module', moduleId: 'm1' })
  exam.instance.stopTimer()

  expect(exam.data.total).toBe(25)
  expect(exam.data.question.number).toBe(1)
  expect(exam.querySelectorAll('.option')).toHaveLength(4)

  exam.instance.chooseOption({ currentTarget: { dataset: { choice: 'A' } } })
  exam.instance.toggleGuess()
  expect(exam.data.selected).toBe('A')
  expect(exam.data.guessed).toBe(true)

  exam.instance.submit(false)
  expect(calls.redirects).toHaveLength(1)
  const recordId = calls.redirects[0].match(/recordId=([^&]+)/)[1]
  exam.detach()
  expect(memory.has('corn_exam_draft_v1:sh-2019-a:module:m1')).toBe(false)

  const review = mount('components/result-review/result-review')
  review.instance.init(paper, { recordId })
  expect(review.data.result.guessed).toBe(1)
  expect(review.data.result.guessedCorrect).toBe(1)
  review.instance.changeFilter({ currentTarget: { dataset: { filter: 'guessed' } } })
  expect(review.data.reviewItems).toHaveLength(1)
  expect(review.data.reviewItems[0].status).toBe('guessed-correct')
  expect(review.data.reviewItems[0].question.explanation.length).toBeGreaterThan(5)
  review.instance.saveAsMethod({ currentTarget: { dataset: { id: review.data.reviewItems[0].questionId } } })
  expect(calls.navigations).toEqual(['/pages/method-editor/method-editor?from=review'])
  const prefill = memory.get('corn_exam_method_prefill_v1')
  expect(prefill.examples).toHaveLength(1)
  expect(prefill.examples[0].sourceType).toBe('paper')
  expect(prefill.examples[0].paperId).toBe(paper.id)
  review.detach()
})

test('draft resumes from the saved question and can exit without submitting', () => {
  const { memory, calls } = createWxMock()
  const moduleId = 'm1'
  const questionIds = paper.modules.find(item => item.id === moduleId).questionIds
  const draftKey = `corn_exam_draft_v1:${paper.id}:module:${moduleId}`
  memory.set(draftKey, {
    answers: { [questionIds[0]]: 'A' },
    guesses: { [questionIds[0]]: true },
    elapsedSeconds: 42,
    index: 1,
    updatedAt: Date.now()
  })

  const exam = mount('components/exam-runner/exam-runner')
  exam.instance.init(paper, { mode: 'module', moduleId })
  exam.instance.stopTimer()

  expect(exam.data.current).toBe(2)
  expect(exam.data.answeredCount).toBe(1)
  expect(exam.data.guessedCount).toBe(1)
  expect(calls.toasts.some(item => item.title === '已续上上次进度')).toBe(true)

  exam.instance.saveAndExit()
  expect(calls.backs).toEqual([1])
  expect(memory.get(draftKey).elapsedSeconds).toBe(42)
  expect(memory.has('corn_exam_history_v1')).toBe(false)
  exam.detach()
})
