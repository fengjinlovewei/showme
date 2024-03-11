import process from 'node:process';globalThis._importMeta_=globalThis._importMeta_||{url:"file:///_entry.js",env:process.env};import { d as defineEventHandler } from '../../runtime.mjs';
import { Marked } from 'marked';
import hljs from 'highlight.js';
import fs from 'fs';
import path from 'path';
import { markedHighlight } from 'marked-highlight';
import { fileURLToPath } from 'url';
import 'node:http';
import 'node:https';
import 'node:fs';
import 'node:url';

console.log("globalThis._importMeta_.url", globalThis._importMeta_.url);
const filename = fileURLToPath(globalThis._importMeta_.url);
console.log("fileURLToPath- globalThis._importMeta_.url", filename);
const _dirname = path.dirname(filename);
console.log("_dirname", _dirname);
const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    }
  })
);
const getMarkdown = defineEventHandler(async (event) => {
  const code = fs.readFileSync(
    path.resolve(_dirname, "../../markdowm/async-await.md"),
    "utf-8"
  );
  const html = await marked.parse(code);
  return {
    html
  };
});

export { getMarkdown as default };
//# sourceMappingURL=getMarkdown.mjs.map
