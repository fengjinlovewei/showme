import { Marked } from "marked";
import hljs from "highlight.js";
import fs from "fs";
import path from "path";
import { markedHighlight } from "marked-highlight";

import { fileURLToPath } from "url";

console.log('import.meta.url', import.meta.url)


const filename = fileURLToPath(import.meta.url); // 这里不能声明__filename,因为已经有内部的__filename了，重复声明会报错

console.log('fileURLToPath- import.meta.url', filename)

const _dirname = path.dirname(filename);

console.log('_dirname', _dirname)

const marked = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang, info) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  })
);

export default defineEventHandler(async (event) => {
  const code = fs.readFileSync(
    path.resolve(_dirname, "../../markdowm/async-await.md"),
    "utf-8"
  );

  const html = await marked.parse(code);
  return {
    html,
  };
});
