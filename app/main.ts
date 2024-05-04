import * as net from 'node:net';

const ECHO_REGEX = /^\/echo\/(.*)$/;

const server = net.createServer((socket) => {
    socket.on('data', data => {
        const dataReceived = data.toString();
        console.log(`Data received: \n`, dataReceived);
        const [firstLine] = dataReceived.split('\r\n');
        const [method, path, httpVersion] = firstLine.split(' ');
        if (path === '/') {
            socket.write('HTTP/1.1 200 OK\r\n\r\n');
        } else if (path.startsWith('/echo/')) {
            const echo = path.match(ECHO_REGEX);
            if (echo && echo.length) {
                const echoStr = echo[1];
                socket.write(`HTTP/1.1 200 OK\r\nContent-Type: text/plain\nContent-Length: ${echoStr.length}\n\r\n${echoStr}`);
            }
        } else {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        }
        socket.end();
    });
});

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

server.listen(4221, 'localhost', () => {
    console.log('Server is running on port 4221');
});
