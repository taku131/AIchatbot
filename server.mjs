import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = resolve(__dirname, "ai-interview-prototype");
const port = Number(process.env.PORT || 8000);
const host = process.env.HOST || "127.0.0.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

function sendText(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function resolveRequestPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0] || "/");
  const relativePath = decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");
  const filePath = resolve(publicDir, normalize(relativePath));
  const pathFromPublicDir = relative(publicDir, filePath);

  if (pathFromPublicDir.startsWith("..") || pathFromPublicDir === "" || resolve(pathFromPublicDir) === pathFromPublicDir) {
    return null;
  }

  return filePath;
}

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method Not Allowed");
    return;
  }

  const filePath = resolveRequestPath(request.url || "/");
  if (!filePath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  let targetPath = filePath;
  try {
    const fileStats = statSync(targetPath);
    if (fileStats.isDirectory()) {
      targetPath = join(targetPath, "index.html");
    }
  } catch {
    sendText(response, 404, "Not Found");
    return;
  }

  const contentType = mimeTypes[extname(targetPath).toLowerCase()] || "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(targetPath)
    .on("error", () => sendText(response, 500, "Internal Server Error"))
    .pipe(response);
});

server.listen(port, host, () => {
  console.log(`AI interview app is running at http://${host}:${port}/`);
});
