export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  OPTIONS = "OPTIONS",
  HEAD = "HEAD"
}

export enum HttpVersion {
  HTTP_1_0 = "HTTP/1.0",
  HTTP_1_1 = "HTTP/1.1",
  HTTP_2_0 = "HTTP/2.0",
  HTTP_3_0 = "HTTP/3.0"
}

export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500
}

export enum HttpStatusText {
  OK = "OK",
  CREATED = "Created",
  NO_CONTENT = "No Content",
  BAD_REQUEST = "Bad Request",
  UNAUTHORIZED = "Unauthorized",
  FORBIDDEN = "Forbidden",
  NOT_FOUND = "Not Found",
  INTERNAL_SERVER_ERROR = "Internal Server Error"
}

export enum ContentType {
  TEXT_PLAIN = "text/plain",
  APPLICATION_JSON = "application/json",
  TEXT_HTML = "text/html",
  APPLICATION_OCTET_STREAM = "application/octet-stream",
  IMAGE_JPEG = "image/jpeg",
  APPLICATION_XML = "application/xml",
  MULTIPART_FORM_DATA = "multipart/form-data"
}

export interface RequestLine {
  method: HttpMethod;
  path: string;
  httpVersion: HttpVersion;
}

export interface HttpHeaders {
  [key: string]: string;
}

export interface ResponseBodyArgs {
  httpVersion: HttpVersion;
  statusText: HttpStatusText;
  statusCode: HttpStatusCode;
  contentType: ContentType;
  body: string | Buffer;
  contentEncoding?: string;
}
