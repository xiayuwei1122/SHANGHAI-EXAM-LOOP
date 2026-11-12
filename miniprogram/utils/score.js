function normalize(value) {
  return Array.from(new Set(String(value || '').toUpperCase().match(/[A-D]/g) || [])).sort().join('')
}

function scoreAttempt(paper, questionIds, answers, guesses) {
  const byId = Object.create(null)
  paper.questions.forEach(question => { byId[question.id] = question })
  const details = []
  const moduleMap = Object.create(null)
  let correct = 0
  let wrong = 0
  let blank = 0
  let unscored = 0
  let guessed = 0
  let guessedCorrect = 0

  questionIds.forEach(id => {
    const question = byId[id]
    if (!question) return
    const answer = normalize(question.answer)
    const userAnswer = normalize(answers[id])
    const isGuessed = Boolean(guesses[id])
    let status = 'unscored'

    if (!answer) {
      unscored += 1
    } else if (!userAnswer) {
      blank += 1
      status = 'blank'
    } else if (userAnswer === answer) {
      correct += 1
      status = isGuessed ? 'guessed-correct' : 'correct'
      if (isGuessed) guessedCorrect += 1
    } else {
      wrong += 1
      status = 'wrong'
    }
    if (isGuessed) guessed += 1

    if (!moduleMap[question.moduleId]) {
      moduleMap[question.moduleId] = { id: question.moduleId, name: question.moduleName, correct: 0, total: 0 }
    }
    if (answer) {
      moduleMap[question.moduleId].total += 1
      if (userAnswer === answer) moduleMap[question.moduleId].correct += 1
    }
    details.push({ questionId: id, status, userAnswer, answer, guessed: isGuessed })
  })

  const scored = correct + wrong + blank
  const trainingScore = scored ? Math.round(correct / scored * 100) : 0
  const modules = Object.values(moduleMap).map(item => ({
    ...item,
    score: item.total ? Math.round(item.correct / item.total * 100) : 0
  }))
  return { correct, wrong, blank, unscored, guessed, guessedCorrect, scored, trainingScore, modules, details }
}

module.exports = { normalize, scoreAttempt }
