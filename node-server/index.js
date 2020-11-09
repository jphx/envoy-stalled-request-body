var http = require('http'),
    https = require('https'),
    util = require('util'),
    fs = require('fs'),
    url = require('url'),
    qs = require('querystring');

// openssl req -x509 -newkey rsa:2048 -keyout node-server-key.pem -out  node-server-crt.pem -days 3650 -nodes -subj '/CN=node-server'

var requestCounter = 0;
var httpPort = 8080;
var httpsPort = 8443;

console.log('listening on http port: ', httpPort);
var httpServer = http.createServer(handleRequest);
httpServer.keepAliveTimeout = 65000;
httpServer.listen(httpPort);

var options = {
    key: fs.readFileSync('node-server-key.pem'),
    cert: fs.readFileSync('node-server-crt.pem')
};

console.log('listening on https port: ', httpsPort);
var httpsServer = https.createServer(options, handleRequest);
httpsServer.keepAliveTimeout = 65000;
httpsServer.listen(httpsPort);

function handleRequest(req, res) {
    var chunks = 0, len = 0, pathinfo = url.parse(req.url);

    requestCounter++;
    console.log(util.format('%s %s HTTP/%s', req.method, req.url, req.httpVersion));
    console.log(req.headers);

    if (req.method == 'GET' && pathinfo.pathname == '/health') {
        res.write('ok');
        res.end();
    } else if (req.method == 'GET' && pathinfo.pathname == '/test') {
        res.write('ok\n');
        res.end();
    } else if (req.method == 'GET' && pathinfo.pathname == '/fail502') {
        res.statusCode = 502;
        res.end();
    } else if (req.method == 'POST' && pathinfo.pathname == '/postme') {
        setTimeout(handlePostAfterSleep, 200, req, res);
    } else {
        res.statusCode = 404;
        res.end();
    }
}

function handlePostAfterSleep(req, res) {
    let body = '';
    let bodyLen = 0;
    let contentLength = Number(req.headers['content-length']);
    req.on('data', chunk => {
        bodyLen += chunk.length;
        body += chunk.toString();
    });
    req.on('end', () => {
        if (bodyLen != contentLength) {
            console.log('LENGTH MISMATCH');
            console.log('content-length: ', contentLength);
            console.log('body.length: ', body.length);
            console.log('bodyLen: ', bodyLen);
            console.log('body: ', body);
        }
        res.end('ok\n');
    });
}
