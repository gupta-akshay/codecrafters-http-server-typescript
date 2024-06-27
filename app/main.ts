import * as net from "node:net";
import { promises as fs } from "node:fs";
import * as nodePath from "node:path";
import {
  ContentType,
  HttpHeaders,
  HttpMethod,
  HttpStatusCode,
  HttpStatusText,
  HttpVersion,
  RequestLine,
  ResponseBodyArgs,
} from "./types";

const ECHO_REGEX = /^\/echo\/(.*)$/;
const FILE_REGEX = /^\/files\/(.+)$/;

// Handling command-line arguments to get the directory path
const args = process.argv.slice(2);
const directoryPath = args[0] === "--directory" && args[1] ? args[1] : "";

// Extracts method, path, and HTTP version from the request line
const extractMethodAndPath = (text: string): RequestLine => {
  const [firstLine] = text.split("\r\n");
  const [method, path, httpVersion] = firstLine.split(" ");
  return {
    method: method as HttpMethod,
    path,
    httpVersion: httpVersion as HttpVersion,
  };
};

// Parses headers from the request and combines them with the request line data
const parseHeaders = (data: string): HttpHeaders & RequestLine => {
  const [firstLine, ...rest] = data.split("\r\n");
  const headers: HttpHeaders = rest
    .filter((line) => line.includes(":"))
    .reduce((acc: HttpHeaders, line) => {
      // Ensure the initial value matches the expected type
      const [key, value] = line.split(":");
      acc[key.trim()] = value.trim();
      return acc;
    }, {} as HttpHeaders); // Explicitly type the initial value as HttpHeaders
  return { ...headers, ...extractMethodAndPath(data) };
};

// Creates a response body string from given parameters
const createResponseBody = ({
  httpVersion,
  statusText,
  statusCode,
  contentType,
  body,
  contentEncoding,
}: ResponseBodyArgs): string => {
  const headers = [
    `Content-Type: ${contentType}`,
    `Content-Length: ${Buffer.byteLength(body)}`
  ]
  if (contentEncoding) {
    headers.push(`Content-Encoding: ${contentEncoding}`);
  }
  const preHeaders = `${httpVersion} ${statusCode} ${statusText}`;
  return `${preHeaders}\r\n${headers.join('\r\n')}\r\n\r\n${body}`;
};

// Main server logic using Node's net module
const server = net.createServer((socket) => {
  console.log("Connection established");

  socket.on("data", async (data) => {
    const dataReceived = data.toString();
    console.log(`Received data: ${dataReceived}`);
    const headers = parseHeaders(dataReceived);

    const {
      method,
      path,
      httpVersion,
      'Accept-Encoding': acceptEncoding
    } = headers;

    // Handle POST requests to save files
    if (method === HttpMethod.POST && FILE_REGEX.test(path)) {
      const match = FILE_REGEX.exec(path);
      if (match) {
        const filePath = nodePath.join(directoryPath, match[1]);
        try {
          // Write file and send a 201 Created response
          await fs.writeFile(filePath, dataReceived.split("\r\n\r\n")[1]);
          socket.write(
            `${httpVersion} ${HttpStatusCode.CREATED} ${HttpStatusText.CREATED}\r\n\r\n`
          );
        } catch (error) {
          socket.write(
            `${httpVersion} ${HttpStatusCode.INTERNAL_SERVER_ERROR} ${HttpStatusText.INTERNAL_SERVER_ERROR}\r\n\r\n`
          );
        }
        return;
      }
    }

    // Handle requests based on path
    if (path === "/") {
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
    }
    
    if (ECHO_REGEX.test(path)) {
      const responseBody = path.replace(ECHO_REGEX, "$1");
      const response = createResponseBody({
        httpVersion,
        statusCode: HttpStatusCode.OK,
        statusText: HttpStatusText.OK,
        contentType: ContentType.TEXT_PLAIN,
        body: responseBody,
        contentEncoding:
          acceptEncoding && acceptEncoding.includes("gzip") ? "gzip" : undefined,
      });
      socket.write(response);
    }
    
    if (FILE_REGEX.test(path)) {
      const match = FILE_REGEX.exec(path);
      if (match) {
        try {
          // Read file and send it with a 200 OK response
          const filePath = nodePath.join(directoryPath, match[1]);
          const fileContents = await fs.readFile(filePath);
          const response = createResponseBody({
            httpVersion,
            statusCode: HttpStatusCode.OK,
            statusText: HttpStatusText.OK,
            contentType: ContentType.APPLICATION_OCTET_STREAM,
            body: fileContents,
          });
          socket.write(response);
        } catch {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
      }
    }
    
    if (path === "/user-agent") {
      const response = createResponseBody({
        httpVersion,
        statusCode: HttpStatusCode.OK,
        statusText: HttpStatusText.OK,
        contentType: ContentType.TEXT_PLAIN,
        body: headers["User-Agent"] || "Unknown",
      });
      socket.write(response);
    }

    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.end();
  });

  socket.on("end", () => {
    console.log("Connection ended");
  });

  socket.on("error", (err) => {
    console.error(`Error: ${err}`);
    socket.end("HTTP/1.1 500 Internal Server Error\r\n\r\n");
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
