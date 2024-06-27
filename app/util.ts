import {
  HttpHeaders,
  HttpMethod,
  HttpVersion,
  RequestLine,
  ResponseBodyArgs,
} from "./types";

// Extracts method, path, and HTTP version from the request line
export const extractMethodAndPath = (text: string): RequestLine => {
  const [firstLine] = text.split("\r\n");
  const [method, path, httpVersion] = firstLine.split(" ");
  return {
    method: method as HttpMethod,
    path,
    httpVersion: httpVersion as HttpVersion,
  };
};

// Parses headers from the request and combines them with the request line data
export const parseHeaders = (data: string): HttpHeaders & RequestLine => {
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
export const createResponseBody = ({
  httpVersion,
  statusText,
  statusCode,
  contentType,
  body,
  contentEncoding,
}: ResponseBodyArgs): string => {
  const preHeaders = `${httpVersion} ${statusCode} ${statusText}`;
  const headers = [
    `Content-Type: ${contentType}`,
    `Content-Length: ${
      contentEncoding === "gzip" ? body.length : Buffer.byteLength(body)
    }`,
  ];
  if (contentEncoding === "gzip") {
    headers.push(`Content-Encoding: ${contentEncoding}`);
    return `${preHeaders}\r\n${headers.join("\r\n")}\r\n\r\n`;
  }
  return `${preHeaders}\r\n${headers.join("\r\n")}\r\n\r\n${body}`;
};
