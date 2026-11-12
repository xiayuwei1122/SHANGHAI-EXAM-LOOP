const assert = require('assert')
const { normalize, scoreAttempt } = require('../miniprogram/utils/score')

assert.strictEqual(normalize('caac'), 'AC')

const paper = {
  questions: [
    { id: 'q1', moduleId: 'm1', moduleName: '言语', answer: 'A' },
    { id: 'q2', moduleId: 'm1', moduleName: '言语', answer: 'BC' },
    { id: 'q3', moduleId: 'm2', moduleName: '判断', answer: 'D' },
    { id: 'q4', moduleId: 'm2', moduleName: '判断', answer: '' }
  ]
}
const result = scoreAttempt(paper, ['q1', 'q2', 'q3', 'q4'], { q1: 'A', q2: 'CB', q3: '' }, { q1: true })
assert.deepStrictEqual(
  { correct: result.correct, wrong: result.wrong, blank: result.blank, unscored: result.unscored, guessedCorrect: result.guessedCorrect, score: result.trainingScore },
  { correct: 2, wrong: 0, blank: 1, unscored: 1, guessedCorrect: 1, score: 67 }
)
assert.strictEqual(result.details[0].status, 'guessed-correct')
assert.strictEqual(result.modules[0].score, 100)
console.log('score.test.js: OK')
