const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { catalog } = require('../miniprogram/data/index')

assert.strictEqual(catalog.length, 10)
let questions = 0
let answers = 0

catalog.forEach(summary => {
  const paper = require(`../miniprogram/packages/${summary.id}/paper`)
  assert(paper, `${summary.id}: paper missing`)
  assert.strictEqual(paper.questionCount, paper.questions.length)
  assert.strictEqual(paper.modules.reduce((sum, item) => sum + item.questionCount, 0), paper.questionCount)
  paper.questions.forEach(question => {
    assert(question.stem || question.images.length, `${paper.id}/${question.id}: no stem or image`)
    assert(question.options.length >= 2, `${paper.id}/${question.id}: too few options`)
    assert(question.explanation, `${paper.id}/${question.id}: explanation missing`)
    const images = question.images.concat(...question.options.map(option => option.images || []))
    images.forEach(image => {
      const target = path.join(__dirname, '..', 'miniprogram', image.replace(/^\//, ''))
      assert(fs.existsSync(target), `${paper.id}/${question.id}: image missing ${image}`)
    })
  })
  questions += paper.questionCount
  answers += paper.answerCount
})

assert.strictEqual(questions, 1285)
assert.strictEqual(answers, 1258)
console.log(`data.test.js: OK (${questions} questions / ${answers} answers)`)
