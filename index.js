//test on https://www.piesocket.com/websocket-tester with wss://robopoll-server.herokuapp.com/
const ws = require('ws')
const qs = require('querystring')
const wss = new ws.WebSocketServer({ port: process.env.PORT || 8080 })

let gameMetaData = []
let inGame = false

wss.on('connection', function connection(ws) {
  ws.on('message', function message(rawData) {
    let route = rawData.toString().match(/[^?]*/)[0]
    let data = qs.parse(rawData.toString().replace(route, '').substring(1))
    console.log(route)
    console.log(data)
    switch (route) {
      case 'hostInit':
        initalizeHostGame(data, ws)
        break
      case 'userInit':
        initializeUser(data, ws)
        break
      case 'hostStartGame':
        hostStartGame(data, ws)
        break
      case 'hostSaveQuestion':
        hostSaveQuestion(data, ws)
        break
      case 'hostNextQuestion':
        hostNextQuestion(data, ws)
        break
      case 'userSubmitAnswer':
        userSubmitAnswer(data, ws)
        break
      case 'hostShowAnswers':
        hostShowAnswers(data, ws)
        break
      case 'leaveGame':
        leaveGame(data, ws)
      case 'endGame':
        endGame(data, ws)
        break
      case 'ping':
        console.log('user still connected')
        break
      case 'close':
        ws.close()
        break
      default:
        ws.send('error?reason=routeNotFound')
        break
    }
    console.log(gameMetaData)
  })
})

function initalizeHostGame(data, ws) {
  let gameCode
  do {
    gameCode = makeid()
  } while (
    gameMetaData.length < 0 ||
    gameMetaData.some((e) => e.code === gameCode)
  )
  gameMetaData.push({
    code: gameCode,
    host: { id: ws._socket.remoteAddress.toString(), conn: ws },
    users: [],
    questions: [],
  })
  ws.send(`initStatus?status=success&code=${gameCode}`)
}

function initializeUser(data, ws) {
  let game = gameMetaData.findIndex((e) => e.code === data.code)
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`initStatus?status=error&error=codeNotFound`)
    return
  } else if ('currQuestion' in gameMetaData[game]) {
    ws.send(`initStatus?status=error&error=gameAlreadyStarted`)
    return
  } else if (
    gameMetaData.some((e) =>
      e.users.some((e) => e.id === ws._socket.remoteAddress.toString()),
    ) &&
    inGame
  ) {
    ws.send(`initStatus?status=error&error=alreadyInGame`)
    return
  }

  let user = { id: ws._socket.remoteAddress.toString(), conn: ws }
  gameMetaData[game].users.push(user)
  ws.send(`initStatus?status=success`)
  inGame = true
  gameMetaData[game].host.conn.send(
    `userUpdate?users=${gameMetaData[game].users.length}`,
  )
}

/*
    Question JSON format:
    {
        question: "...",
        options: ["1","2","3","4"],
        answers: [0,0,0,0]
    }
*/

function hostSaveQuestion(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`questionStatus?status=error&error=codeNotFound`)
    return
  } else if (
    !(
      gameMetaData.find((e) => e.code === data.code).host.id ===
      ws._socket.remoteAddress.toString()
    )
  ) {
    ws.send(`questionStatus?status=error&error=notHost`)
    return
  } else if (
    !data ||
    !data.question ||
    !data.options ||
    data.options.length != 4
  ) {
    ws.send(`questionStatus?status=error&error=wrongFormat`)
    return
  }
  let game = gameMetaData.findIndex((e) => e.code === data.code)
  let question = {
    question: data.question,
    options: data.options,
    answers: [0, 0, 0, 0],
  }
  gameMetaData[game].questions.push(question)
  ws.send(
    `questionStatus?status=success&questions=${gameMetaData[game].questions.length}`,
  )
}

function hostStartGame(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`startStatus?status=error&error=codeNotFound`)
    return
  } else if (
    !(
      gameMetaData.find((e) => e.code === data.code).host.id ===
      ws._socket.remoteAddress.toString()
    )
  ) {
    ws.send(`startStatus?status=error&error=notHost`)
    return
  } else if ('currQuestion' in gameMetaData.find((e) => e.code === data.code)) {
    ws.send(`startStatus?status=error&error=gameAlreadyStarted`)
    return
  }

  let game = gameMetaData.findIndex((e) => e.code === data.code)
  gameMetaData[game].currQuestion = 0
  wss.clients.forEach((client) => {
    client.send(`gameStart?code=${gameMetaData[game].code}`)
  })
  ws.send(`startStatus?status=success&currQuestion=0`)
  gameMetaData[game].users.forEach((user) => {
    user.conn.send(
      `newQuestion?question=${JSON.stringify(gameMetaData[game].questions[0])}`,
    )
    user.answeredQuestion = false
  })
}

function userSubmitAnswer(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`submitStatus?status=error&error=codeNotFound`)
    return
  } else if (
    !gameMetaData
      .find((e) => e.code === data.code)
      .users.some((e) => e.id === ws._socket.remoteAddress.toString())
  ) {
    ws.send(`submitStatus?status=error&error=userNotFound`)
    return
  } else if (
    gameMetaData
      .find((e) => e.code === data.code)
      .users.find((e) => e.id === ws._socket.remoteAddress.toString())
      .answeredQuestion
  ) {
    ws.send(`submitStatus?status=error&error=questionAlreadyAnswered`)
    return
  } else if (typeof data.answer === 'undefined') {
    ws.send(`submitStatus?status=error&error=noAnswerSubmitted`)
    return
  } else if (data.answer > 4) {
    ws.send(`submitStatus?status=error&error=answerOutOfRange`)
    return
  }
  let game = gameMetaData.findIndex((e) => e.code === data.code)
  gameMetaData[game].questions[gameMetaData[game].currQuestion].answers[
    data.answer
  ]++
  gameMetaData[game].host.conn.send(
    `userAnswered?total=${gameMetaData[game].questions[
      gameMetaData[game].currQuestion
    ].answers.reduce((a, b) => a + b, 0)}`,
  )
  gameMetaData[game].users.find(
    (e) => e.id === ws._socket.remoteAddress.toString(),
  ).answeredQuestion = true
  ws.send('submitStatus?status=success')
}

// show question results
function hostShowAnswers(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`answerStatus?status=error&error=codeNotFound`)
    return
  } else if (
    !(
      gameMetaData.find((e) => e.code === data.code).host.id ===
      ws._socket.remoteAddress.toString()
    )
  ) {
    ws.send(`answerStatus?status=error&error=notHost`)
    return
  }

  let game = gameMetaData.findIndex((e) => e.code === data.code)
  ws.send(
    `answerStatus?status=success&results=${JSON.stringify(
      gameMetaData[game].questions[gameMetaData[game].currQuestion].answers,
    )}`,
  )
}

function hostNextQuestion(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`nextQuestionStatus?status=error&error=codeNotFound`)
    return
  } else if (
    !(
      gameMetaData.find((e) => e.code === data.code).host.id ===
      ws._socket.remoteAddress.toString()
    )
  ) {
    ws.send(`nextQuestionStatus?status=error&error=notHost`)
    return
  }

  let game = gameMetaData.findIndex((e) => e.code === data.code)
  if (
    gameMetaData[game].currQuestion + 1 <
    gameMetaData[game].questions.length
  ) {
    gameMetaData[game].currQuestion++
    gameMetaData[game].users.forEach((user) => {
      user.conn.send(
        `newQuestion?question=${JSON.stringify(
          gameMetaData[game].questions[gameMetaData[game].currQuestion],
        )}`,
      )
      user.answeredQuestion = false
    })
    ws.send(
      `nextQuestionStatus?status=success&currQuestion=${gameMetaData[game].currQuestion}`,
    )
  } else {
    gameMetaData[game].users.forEach((user) => {
      user.conn.send('goodbye')
      user.conn.close()
    })
    ws.send('goodbye')
    ws.close()
    gameMetaData.splice(
      gameMetaData.findIndex((e) => e.code === data.code),
      1,
    )
  }
}

function leaveGame(data, ws) {
  inGame = false
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`leaveGame?status=error&error=codeNotFound`)
    return
  } else if (
    !gameMetaData
      .find((e) => e.code === data.code)
      .users.some((e) => e.id === ws._socket.remoteAddress.toString())
  ) {
    ws.send(`leaveGame?status=error&error=userNotFound`)
    return
  }
  ws.send('goodbye')
  ws.close()
  gameMetaData
    .find((e) => e.code === data.code)
    .users.splice(
      gameMetaData
        .find((e) => e.code === data.code)
        .users.findIndex((e) => e.id === ws._socket.remoteAddress.toString()),
      1,
    )
}

function endGame(data, ws) {
  if (!data || !data.code || !gameMetaData.some((e) => e.code === data.code)) {
    ws.send(`endGame?status=error&error=codeNotFound`)
    return
  } else if (
    !(
      gameMetaData.find((e) => e.code === data.code).host.id ===
      ws._socket.remoteAddress.toString()
    )
  ) {
    ws.send(`endGame?status=error&error=notHost`)
    return
  }
  let game = gameMetaData.findIndex((e) => e.code === data.code)
  gameMetaData[game].users.forEach((user) => {
    user.conn.send('goodbye')
    user.conn.close()
  })
  ws.send('goodbye')
  ws.close()
  gameMetaData.splice(
    gameMetaData.findIndex((e) => e.code === data.code),
    1,
  )
}

function makeid() {
  let result = ''
  let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let charactersLength = characters.length
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}
