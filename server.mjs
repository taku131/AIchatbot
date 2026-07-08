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

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(body));
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
    if (Buffer.concat(chunks).length > 1024 * 1024) {
      throw new Error("Request body is too large");
    }
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function extractOutputText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const output = Array.isArray(data.output) ? data.output : [];
  for (const item of output) {
    const content = Array.isArray(item.content) ? item.content : [];
    for (const part of content) {
      if (typeof part.text === "string") {
        return part.text;
      }
    }
  }

  return "";
}

async function handleOpenAiProxy(request, response) {
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "Method Not Allowed" });
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    sendJson(response, 400, { error: "Invalid JSON request body" });
    return;
  }

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey.trim() : "";
  const model = typeof payload.model === "string" && payload.model.trim() ? payload.model.trim() : "gpt-4.1-mini";
  const prompt = typeof payload.prompt === "string" ? payload.prompt : "";
  const schema = payload.schema && typeof payload.schema === "object" ? payload.schema : null;
  const task = typeof payload.task === "string" && payload.task.trim() ? payload.task.trim() : "ai_task";

  if (!apiKey) {
    sendJson(response, 400, { error: "OpenAI API key is required" });
    return;
  }
  if (!prompt || !schema) {
    sendJson(response, 400, { error: "Prompt and JSON schema are required" });
    return;
  }

  try {
    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "あなたは日本語の就職・研究面接練習コーチです。出力は指定されたJSON Schemaに厳密に従ってください。"
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: task.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 64) || "ai_task",
            strict: true,
            schema
          }
        }
      })
    });

    const data = await openAiResponse.json().catch(() => ({}));
    if (!openAiResponse.ok) {
      sendJson(response, openAiResponse.status, {
        error: data.error && data.error.message ? data.error.message : "OpenAI API request failed"
      });
      return;
    }

    const text = extractOutputText(data);
    if (!text) {
      sendJson(response, 502, { error: "OpenAI response did not include output text" });
      return;
    }

    try {
      sendJson(response, 200, { result: JSON.parse(text) });
    } catch (error) {
      sendJson(response, 502, { error: "OpenAI response was not valid JSON", raw: text });
    }
  } catch (error) {
    sendJson(response, 502, { error: error && error.message ? error.message : "OpenAI proxy failed" });
  }
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
  const urlPath = (request.url || "/").split("?")[0] || "/";
  if (urlPath === "/api/openai") {
    handleOpenAiProxy(request, response);
    return;
  }

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
