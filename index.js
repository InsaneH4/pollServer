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
    let route = rawData.match(/[^\?]*/)[0];
    let data = rawData.replace(route,'');
    console.log(route);
    console.log(data);
    switch (route) {
        case 'hostInit':
            initalizeHostGame(data);
            break;
        case 'userInit':
            break;
        case 'hostStartGame':
            break;
        case 'hostPostQuestion':
            break;
        case 'userSubmitAnswer':
            break;
        default:
            console.log('You done fucked up');
            break;
    }
  });

  ws.send('hostInit?name=test&?data=fgfdgdg');
});

function initalizeHostGame(data) {
    
}
