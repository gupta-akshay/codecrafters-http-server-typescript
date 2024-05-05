import * as net from "node:net";

interface RequestLine {
  method: string;
  path: string;
  httpVersion: string;
}

interface Headers {
  [key: string]: string;
}

interface ResponseBodyArgs {
  httpVersion: string;
  statusText: string;
  statusCode: number;
  'Content-Type': 'text/plain';
  body: string;
}

// Regex to identify echo commands in URL paths
const ECHO_REGEX = /^\/echo\/(.*)$/;

const extractMethodAndPath = (text: string): RequestLine => {
  const [firstline] = text.split("\r\n");
  const [method, path, httpVersion] = firstline.split(" ");
  return {
    method,
    path,
    httpVersion,
  };
};

const parseHeaders = (data: string): Headers & RequestLine => {
  const [firstLine, ...rest] = data.split("\r\n");
  const headers: Headers = rest
    .filter((pair) => pair.includes(':'))
    .reduce((acc: Headers, cur) => {
      const [key, value] = cur.split(":");
      acc[key.trim()] = value.trim();
      return acc;
    }, {});

  return { ...headers, ...extractMethodAndPath(data) };
};

const createResponseBody = ({
  httpVersion, statusText, statusCode, "Content-Type": contentType, body
}: ResponseBodyArgs): string => {
  return `${httpVersion} ${statusCode} ${statusText}\r\nContent-Type: ${contentType}\r\nContent-Length: ${body.length}\r\n\r\n${body}`;
};

// Create the server using Node's net module
const server = net.createServer((socket) => {
  console.log('Connection established');

  socket.on("data", (data) => {
    const dataReceived = data.toString();
    console.log(`Received data: ${dataReceived}`);
    const headers = parseHeaders(dataReceived);

    const { path, httpVersion } = headers;

    if (path === '/') {
      socket.write('HTTP/1.1 200 OK\r\n\r\n');
    } else if (ECHO_REGEX.test(path)) {
      const match = ECHO_REGEX.exec(path);
      const response = createResponseBody({
        httpVersion,
        statusCode: 200,
        statusText: 'OK',
        'Content-Type': 'text/plain',
        body: match ? match[1] : '',
      });
      socket.write(`${response}\r\n`);
    } else if (path === '/user-agent') {
      const response = createResponseBody({
        httpVersion,
        statusCode: 200,
        statusText: 'OK',
        'Content-Type': 'text/plain',
        body: headers['User-Agent'] || 'Unknown',
      });
      socket.write(`${response}\r\n`);
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    }
    socket.end();
  });

  socket.on('end', () => {
    console.log('Connection ended');
  });

  socket.on('error', (err) => {
    console.error(`Error: ${err}`);
    socket.end('HTTP/1.1 500 Internal Server Error\r\n\r\n');
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
