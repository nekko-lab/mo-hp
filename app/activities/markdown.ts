import 'server-only';

import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

// Growi の本文は編集者が自由に書けるため、marked が生成した HTML は必ず sanitize-html を
// 通してから描画側へ渡す（script / onerror などを除去する）。
const sanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    'h1',
    'h2',
    'img',
    'del',
    'input', // GFM のタスクリスト（- [x] ...）
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    a: ['href', 'title', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
    input: ['type', 'checked', 'disabled'],
    th: ['colspan', 'rowspan', 'align'],
    td: ['colspan', 'rowspan', 'align'],
  },
  allowedClasses: {
    code: ['language-*'],
    pre: ['language-*'],
    input: ['task-list-item-checkbox'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  transformTags: {
    // 外部リンクは新規タブで開き、tabnabbing を防ぐ。
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, target: '_blank', rel: 'noopener noreferrer' },
    }),
    // Growi の添付画像は `/attachment/...` のような相対パスで来るため、
    // このサイトのドメインではなく Growi 側を指すように絶対 URL へ直す。
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, src: resolveGrowiUrl(attribs.src), loading: 'lazy' },
    }),
  },
};

function resolveGrowiUrl(src: string | undefined) {
  if (!src) {
    return '';
  }

  if (!src.startsWith('/')) {
    return src;
  }

  const baseUrl = process.env.GROWI_URL;

  return baseUrl ? `${baseUrl.replace(/\/$/, '')}${src}` : src;
}

/** Growi のマークダウン本文を、描画してよい HTML 文字列へ変換する。 */
export function renderMarkdown(markdown: string): string {
  const html = marked.parse(markdown, {
    async: false,
    gfm: true, // 表・取り消し線・タスクリストなど Growi でよく使う記法を有効化
    breaks: true, // 単一改行を <br> に（Growi の見た目に合わせる）
  });

  return sanitizeHtml(html, sanitizeOptions);
}
