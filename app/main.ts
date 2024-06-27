import net from "node:net";
import { promises as fs } from "node:fs";
import nodePath from "node:path";
import zlib from "node:zlib";
import { parseHeaders, createResponseBody } from "./util";
import {
  ContentType,
  HttpMethod,
  HttpStatusCode,
  HttpStatusText,
  HttpVersion,
} from "./types";

const ECHO_REGEX = /^\/echo\/(.*)$/;
const FILE_REGEX = /^\/files\/(.+)$/;

// Handling command-line arguments to get the directory path
const args = process.argv.slice(2);
const directoryPath = args[0] === "--directory" && args[1] ? args[1] : "";

// Handle POST requests to save files
const handlePostRequest = async (
  socket: net.Socket,
  httpVersion: HttpVersion,
  path: string,
  data: string
) => {
  const match = FILE_REGEX.exec(path);
  if (match) {
    const filePath = nodePath.join(directoryPath, match[1]);
    try {
      // Write file and send a 201 Created response
      await fs.writeFile(filePath, data.split("\r\n\r\n")[1]);
      socket.write(
        `${httpVersion} ${HttpStatusCode.CREATED} ${HttpStatusText.CREATED}\r\n\r\n`
      );
    } catch (error) {
      socket.write(
        `${httpVersion} ${HttpStatusCode.INTERNAL_SERVER_ERROR} ${HttpStatusText.INTERNAL_SERVER_ERROR}\r\n\r\n`
      );
    }
  }
};

// Handle echo requests
const handleEchoRequest = (
  socket: net.Socket,
  httpVersion: HttpVersion,
  path: string,
  incomingEncodings: string[]
) => {
  const responseBody = path.replace(ECHO_REGEX, "$1");
  if (incomingEncodings.includes("gzip")) {
    const buffer = Buffer.from(responseBody, "utf8");
    const compressedBody = zlib.gzipSync(buffer);
    const response = createResponseBody({
      httpVersion,
      statusCode: HttpStatusCode.OK,
      statusText: HttpStatusText.OK,
      contentType: ContentType.TEXT_PLAIN,
      body: compressedBody,
      contentEncoding: "gzip",
    });
    socket.write(response);
    socket.write(compressedBody);
  } else {
    const response = createResponseBody({
      httpVersion,
      statusCode: HttpStatusCode.OK,
      statusText: HttpStatusText.OK,
      contentType: ContentType.TEXT_PLAIN,
      body: responseBody,
    });
    socket.write(response);
  }
  socket.end();
};

// Handle file requests
const handleFileRequest = async (
  socket: net.Socket,
  httpVersion: HttpVersion,
  path: string
) => {
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
};

// Handle user-agent requests
const handleUserAgentRequest = (
  socket: net.Socket,
  httpVersion: HttpVersion,
  userAgent: string
) => {
  const response = createResponseBody({
    httpVersion,
    statusCode: HttpStatusCode.OK,
    statusText: HttpStatusText.OK,
    contentType: ContentType.TEXT_PLAIN,
    body: userAgent || "Unknown",
  });
  socket.write(response);
};

// Main server logic using Node's net module
const server = net.createServer((socket) => {
  console.log("Connection established");

  socket.on("data", async (data) => {
    const dataReceived = data.toString();
    console.log(`Received data: ${dataReceived}`);
    const headers = parseHeaders(dataReceived);

    const { method, path, httpVersion, "Accept-Encoding": acceptEncoding } =
      headers;

    const incomingEncodings =
      acceptEncoding
        ?.split(",")
        .map((encoding) => encoding.trim().toLowerCase()) || [];

    switch (method) {
      case HttpMethod.POST:
        await handlePostRequest(socket, httpVersion, path, dataReceived);
        break;
      case HttpMethod.GET:
        if (path === "/") {
          socket.write("HTTP/1.1 200 OK\r\n\r\n");
        } else if (ECHO_REGEX.test(path)) {
          handleEchoRequest(socket, httpVersion, path, incomingEncodings);
        } else if (FILE_REGEX.test(path)) {
          await handleFileRequest(socket, httpVersion, path);
        } else if (path === "/user-agent") {
          handleUserAgentRequest(socket, httpVersion, headers["User-Agent"]);
        } else {
          socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
        break;
      default:
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    }
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
