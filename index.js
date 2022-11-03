//test on https://www.piesocket.com/websocket-tester with ws://localhost:8080
const fs = require('fs');
const ws = require('ws');
const https = require('https');

// const server = https.createServer({
//     cert: fs.readFileSync('cert.pem', 'utf8'),
//     key: fs.readFileSync('key.pem', 'utf8'),
// }).listen(8080);

// const wss = new ws.WebSocketServer({server});

const wss = new ws.WebSocketServer({port: 8080});

wss.on('connection', function connection(ws) {
    ws.on('message', function message(rawData) {
        let route = rawData.toString().match(/[^?]*/)[0];
        let data = rawData.toString().replace(route, '');
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
            case 'hostPostQuestion':
                hostPostQuestion(data, ws);
                break;
            case 'userSubmitAnswer':
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

    ws.send('hostInit?name=test&?data=fgfdgdg');
});

function initalizeHostGame(data, ws) {
    ws.send('initalizing game');
}

function initializeUser(data, ws) {
    ws.send('initializing user');
}

function hostStartGame(data, ws) {
    ws.send('starting game');
}

function hostPostQuestion(data, ws) {
    ws.send('posting question');
}

function userSubmitAnswer(data, ws) {
    ws.send('submitting answer');
}
