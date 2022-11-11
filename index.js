//test on https://www.piesocket.com/websocket-tester with ws://localhost:8080
const ws = require('ws');
const qs = require('querystring');
const wss = new ws.WebSocketServer({port: 8080});

let gameMetaData = [];

wss.on('connection', function connection(ws) {
    ws.on('message', function message(rawData) {
        let route = rawData.toString().match(/[^?]*/)[0];
        let data = qs.parse(rawData.toString().replace(route, '').substring(1));
        console.log(route);
        console.log(data);
        switch (route) {
            case 'hostInit':
                initalizeHostGame(data, ws);
                break;
            case 'userInit':
                initializeUser(data, ws);
                break;
            case 'hostStartGame':
                hostStartGame(data, ws);
                break;
            case 'hostSaveQuestion':
                hostSaveQuestion(data, ws);
                break;
            case 'hostNextQuestion':
                hostNextQuestion(data,ws);
                break;
            case 'userAnsweredQuestion':
                userSubmitAnswer(data, ws);
                break;
            case 'close':
                ws.close();
                break;
            default:
                ws.send("invalid");
                console.log('You done fucked up');
                break;
        }
    });
});

function initalizeHostGame(data, ws) {
    let gameCode;
    do {
        gameCode = makeid();
    } while (gameMetaData.length < 0 || gameMetaData.some(e => e.code === gameCode));
    gameMetaData.push({
        code: gameCode,
        host: ws._socket.remoteAddress.toString(),
        users: [],
        questions: []
    });
}

function initializeUser(data, ws) {
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in joining, no code found');
    else if (!gameMetaData.some(e => e.users.includes(ws._socket.remoteAddress.toString()))) 
        ws.send('Error in joining, already in one game');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    let user = {id: ws._socket.remoteAddress.toString(), conn: ws}
    gameMetaData[game] = gameMetaData[game].users.push(user);
}

function hostStartGame(data, ws) {
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in saving question, no code found');
    else if (!gameMetaData.some(e => e.host === ws._socket.remoteAddress.toString())) 
        ws.send('Error in saving question, not host');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    gameMetaData[game] = gameMetaData[game].currQuestion = 0;
    ws.send(JSON.stringify(gameMetaData[game].questions[0]));
}

function hostNextQuestion(data, ws) {
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in next question, no code found');
    else if (!gameMetaData.some(e => e.host === ws._socket.remoteAddress.toString())) 
        ws.send('Error in next question, not host');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    //also, if at the end, end poll
    //test this
    gameMetaData[game].users.forEach(user => {
        user.conn.send(JSON.stringify(gameMetaData[game].questions[gameMetaData[game].currQuestion]));
    });
    gameMetaData[game].currQuestion++;
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
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in saving question, no code found');
    else if (!gameMetaData.some(e => e.host === ws._socket.remoteAddress.toString())) 
        ws.send('Error in saving question, not host');
    else if(data.question || data.options || data.options.length == 4)
        ws.send('Error in saving question, question not formatted properly');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    data.answers = [0,0,0,0];
    gameMetaData[game] = gameMetaData[game].questions.push(data);
}



function userSubmitAnswer(data, ws) {
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in saving question, no code found');
    else if (gameMetaData.find(e => e.code === data.code).users.some(e => e.id === ws._socket.remoteAddress.toString()))
        ws.send('Error in submitting answer, not in the users list');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    gameMetaData[game] = gameMetaData[game].questions[gameMetaData[game].currQuestion].answers[data.answer]++;
}

// show question results
function hostShowAnswers(data, ws) {
    if (e.code && !gameMetaData.some(e => e.code === data.code))
        ws.send('Error in saving question, no code found');
    else if (!gameMetaData.some(e => e.host === ws._socket.remoteAddress.toString())) 
        ws.send('Error in saving question, not host');
    let game = gameMetaData.findIndex(e => e.code === data.code);
    gameMetaData[game].users.forEach(user => {
        user.conn.send(JSON.stringify(gameMetaData[game].questions[gameMetaData[game].currQuestion].answers));
    });
}

function makeid() {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < 4; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
