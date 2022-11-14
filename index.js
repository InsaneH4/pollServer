//test on https://www.piesocket.com/websocket-tester with ws://localhost:8080
const ws = require('ws');
const qs = require('querystring');
const wss = new ws.WebSocketServer({port: process.env.PORT || 8080});

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
            case 'userSubmitAnswer':
                userSubmitAnswer(data, ws);
                break;
            case 'hostShowAnswers':
                hostShowAnswers(data,ws);
                break;
            case 'close':
                ws.close();
                break;
            default:
                ws.send("error?reason=routeNotFound");
                break;
        }
        console.log(gameMetaData);
    });
});

function initalizeHostGame(data, ws) {
    let gameCode;
    do {
        gameCode = makeid();
    } while (gameMetaData.length < 0 || gameMetaData.some(e => e.code === gameCode));
    gameMetaData.push({
        code: gameCode,
        host: {id: ws._socket.remoteAddress.toString(), conn: ws},
        users: [],
        questions: []
    });
    ws.send(`success?code=${gameCode}`)
}

function initializeUser(data, ws) {
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
       ws.send(`error?error=codeNotFound`); 
       return;
    }
    else if (gameMetaData.some(e => e.users.some(e => e.id === ws._socket.remoteAddress.toString()))){
        ws.send(`error?error=alreadyInGame`);
        return;
    }
    let game = gameMetaData.findIndex(e => e.code === data.code);
    if('currQuestion' in gameMetaData[game]){
        ws.send(`error?error=gameAlreadyStarted`);
        return;
    }
    let user = {id: ws._socket.remoteAddress.toString(), conn: ws};
    gameMetaData[game].users.push(user);
    ws.send(`success`)
    gameMetaData[game].host.conn.send(`userUpdate?users=${gameMetaData[game].users.length}`)
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
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
        ws.send(`error?error=codeNotFound`); 
        return;
    }
    else if (!(gameMetaData.find(e => e.code === data.code).host.id === ws._socket.remoteAddress.toString())){
        ws.send(`error?error=notHost`); 
        return;
    }
    else if(!data || !data.question || !data.options || data.options.length != 4){
        ws.send(`error?error=wrongFormat`);
        return;
    }
    let game = gameMetaData.findIndex(e => e.code === data.code);
    let question = {
        question: data.question,
        options: data.options,
        answers: [0,0,0,0]
    };
    gameMetaData[game].questions.push(question);
    ws.send(`success?questions=${gameMetaData[game].questions.length}`)
}

function hostStartGame(data, ws) {
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
        ws.send(`error?error=codeNotFound`); 
        return;
    }  
    else if (!(gameMetaData.find(e => e.code === data.code).host.id === ws._socket.remoteAddress.toString())){
        ws.send(`error?error=notHost`); 
        return;
    } 
    else if ("currQuestion" in gameMetaData.find(e => e.code === data.code)){
        ws.send(`error?error=gameAlreadyStarted`); 
        return;
    }
        
    let game = gameMetaData.findIndex(e => e.code === data.code);
    gameMetaData[game].currQuestion = 0;
    ws.send(`success?currQuestion=0`);
    gameMetaData[game].users.forEach(user => {
        user.conn.send(`newQuestion?question=${JSON.stringify(gameMetaData[game].questions[0])}`);
        user.answeredQuestion = false;
    });
}

function userSubmitAnswer(data, ws) {
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
        ws.send(`error?error=codeNotFound`); 
        return;
    }
    else if (!gameMetaData.find(e => e.code === data.code).users.some(e => e.id === ws._socket.remoteAddress.toString())){
        ws.send(`error?error=userNotFound`);
        return;
    }
    else if(gameMetaData.find(e => e.code === data.code).users.find(e => e.id === ws._socket.remoteAddress.toString()).answeredQuestion){
        ws.send(`error?error=questionAlreadyAnswered`);
        return;
    }
    else if (typeof data.answer === "undefined"){
        ws.send(`error?error=noAnswerSubmitted`);
        return;
    }
    else if (data.answer > 4) {
        ws.send(`error?error=answerOutOfRange`);
        return;
    }
    let game = gameMetaData.findIndex(e => e.code === data.code);
    gameMetaData[game].questions[gameMetaData[game].currQuestion].answers[data.answer]++;
    gameMetaData[game].host.conn.send(`userAnswered?total=${gameMetaData[game].questions[gameMetaData[game].currQuestion].answers.reduce((a,b) => a+b,0)}`);
    gameMetaData[game].users.find(e => e.id === ws._socket.remoteAddress.toString()).answeredQuestion = true;
    ws.send('success');
}

// show question results
function hostShowAnswers(data, ws) {
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
        ws.send(`error?error=codeNotFound`); 
        return;
    }
    else if (!(gameMetaData.find(e => e.code === data.code).host.id === ws._socket.remoteAddress.toString())) {
        ws.send(`error?error=notHost`);
        return;
    }
        
    let game = gameMetaData.findIndex(e => e.code === data.code);
    ws.send(`success?results=${JSON.stringify(gameMetaData[game].questions[gameMetaData[game].currQuestion].answers)}`);
}

function hostNextQuestion(data, ws) {
    if (!data || !data.code || !gameMetaData.some(e => e.code === data.code)){
        ws.send(`error?error=codeNotFound`); 
        return;
    }
    else if (!(gameMetaData.find(e => e.code === data.code).host.id === ws._socket.remoteAddress.toString())){
        ws.send(`error?error=notHost`); 
        return;
    }
        
    let game = gameMetaData.findIndex(e => e.code === data.code);
    if(gameMetaData[game].currQuestion + 1 < gameMetaData[game].questions.length){
        gameMetaData[game].currQuestion++;
        gameMetaData[game].users.forEach(user => {
            user.conn.send(`newQuestion?question=${JSON.stringify(gameMetaData[game].questions[gameMetaData[game].currQuestion])}`);
            user.answeredQuestion = false;
        });  
        ws.send(`success?currQuestion=${gameMetaData[game].currQuestion}`)
    }
    else {
        gameMetaData[game].users.forEach(user => {
            user.conn.send('goodbye');
            user.conn.close();
        });
        ws.send('goodbye');
        ws.close();
        delete gameMetaData[game];
    } 
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
