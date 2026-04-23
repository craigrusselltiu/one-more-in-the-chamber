import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_ROOT = 'C:\\Users\\Russell\\Downloads\\Super Pixel Effects Gigapack (Free Version) v2.0.0\\Super Pixel Effects Gigapack (Free Version)\\spritesheet';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const rootArg = readArg('--root') ?? DEFAULT_ROOT;
const port = Number(readArg('--port') ?? 4178);
const root = path.resolve(rootArg);

function readArg(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'content-type': contentType,
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

function isInsideRoot(filePath) {
  const relative = path.relative(root, filePath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function parseFrames(text) {
  const frames = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/frame(\d+)\.png\s*=\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i);
    if (!match) continue;
    frames.push({
      index: Number(match[1]),
      x: Number(match[2]),
      y: Number(match[3]),
      w: Number(match[4]),
      h: Number(match[5]),
    });
  }
  frames.sort((a, b) => a.index - b.index);
  return frames;
}

async function buildManifest() {
  const files = await walk(root);
  const sheets = files.filter((file) => path.basename(file).toLowerCase() === 'spritesheet.png');
  const effects = [];

  for (const sheetPath of sheets) {
    const dir = path.dirname(sheetPath);
    const txtPath = path.join(dir, 'spritesheet.txt');
    let frames = [];
    try {
      frames = parseFrames(await fs.readFile(txtPath, 'utf8'));
    } catch {
      frames = [];
    }

    const relDir = path.relative(root, dir);
    const parts = relDir.split(path.sep);
    const name = parts.at(-1) ?? relDir;
    const category = parts[0] ?? 'Uncategorized';
    const imageRel = path.relative(root, sheetPath);

    effects.push({
      id: imageRel.split(path.sep).join('/'),
      name,
      category,
      group: parts.slice(1, -1).join(' / '),
      relDir: relDir.split(path.sep).join('/'),
      imageUrl: `/asset?file=${encodeURIComponent(imageRel)}`,
      frameCount: frames.length,
      frameWidth: frames[0]?.w ?? 0,
      frameHeight: frames[0]?.h ?? 0,
      frames,
    });
  }

  effects.sort((a, b) =>
    a.category.localeCompare(b.category)
    || a.group.localeCompare(b.group)
    || a.name.localeCompare(b.name),
  );

  return {
    root,
    count: effects.length,
    categories: [...new Set(effects.map((effect) => effect.category))],
    effects,
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (url.pathname === '/' || url.pathname === '/effects-viewer.html') {
      const html = await fs.readFile(path.join(__dirname, 'effects-viewer.html'), 'utf8');
      sendText(res, 200, html, 'text/html; charset=utf-8');
      return;
    }

    if (url.pathname === '/api/effects') {
      sendJson(res, 200, await buildManifest());
      return;
    }

    if (url.pathname === '/asset') {
      const rel = url.searchParams.get('file');
      if (!rel) {
        sendText(res, 400, 'Missing file parameter');
        return;
      }
      const filePath = path.resolve(root, rel);
      if (!isInsideRoot(filePath)) {
        sendText(res, 403, 'Forbidden');
        return;
      }
      const data = await fs.readFile(filePath);
      res.writeHead(200, {
        'content-type': 'image/png',
        'cache-control': 'no-store',
        'content-length': data.length,
      });
      res.end(data);
      return;
    }

    sendText(res, 404, 'Not found');
  } catch (error) {
    sendText(res, 500, error instanceof Error ? error.stack ?? error.message : String(error));
  }
});

server.listen(port, () => {
  console.log(`Effects viewer: http://localhost:${port}`);
  console.log(`Spritesheet root: ${root}`);
});
