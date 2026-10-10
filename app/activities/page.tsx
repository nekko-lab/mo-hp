import type { Metadata } from 'next';
import ActivitiesClient from './ActivitiesClient';
import type { Activity } from './types';
import { fetchGrowiActivities } from './GrowiFetch';
import { renderMarkdown } from './markdown';
import { parse as parseYaml } from 'yaml';

export const metadata: Metadata = {
  title: '活動実績',
  description: "Miku's Origin の活動実績・プロジェクト一覧",
};

// ビルド時には Growi へアクセスせず、リクエスト時に取得する（取得結果は GrowiFetch.ts で1時間キャッシュ）。
export const dynamic = 'force-dynamic';

const GROWI_ACTIVITIES_PATH = '/activities';

type FrontmatterValue = unknown;

// 先頭の BOM・空行・空白と CRLF を許容して `---` で囲まれた部分を切り出す。中身の解釈は yaml に任せる。
const FRONTMATTER_PATTERN =
  /^\uFEFF?\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)([\s\S]*)$/;

/** フロントマターと本文に分ける。YAML として不正な場合は例外を投げる。 */
function parseFrontmatter(markdown: string) {
  const match = markdown.match(FRONTMATTER_PATTERN);

  if (!match) {
    return { data: {} as Record<string, FrontmatterValue>, body: markdown.trim() };
  }

  const parsed: unknown = parseYaml(match[1]);
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, FrontmatterValue>)
      : {};

  return { data, body: match[2].trim() };
}

/** YAML の日付（Date 型）や文字列を YYYY-MM-DD の文字列にそろえる。 */
function toDateString(value: FrontmatterValue) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return typeof value === 'string' ? value : '';
}

/** tags は YAML 配列・カンマ区切り文字列のどちらで書かれても受け付ける。 */
function toStringList(value: FrontmatterValue) {
  const items = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];

  return items.map((item) => String(item).trim()).filter(Boolean);
}

function toOptionalString(value: FrontmatterValue) {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : undefined;
}

function getSafeUrl(value: FrontmatterValue) {
  if (typeof value !== 'string') {
    return undefined;
  }

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

/** 意図しない公開を防ぐため、published が true（大文字小文字は問わない）のときだけ公開する。 */
function isPublished(value: FrontmatterValue) {
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true');
}

async function getActivities(): Promise<Activity[]> {
  let rawActivities;

  try {
    rawActivities = await fetchGrowiActivities(GROWI_ACTIVITIES_PATH);
  } catch (error) {
    // Growi が落ちている / トークンが無効でも活動実績ページ自体は表示できるようにする。
    console.error('GROWI fetch failed, rendering empty activities:', error);
    return [];
  }

  return rawActivities
    .map((raw): Activity | null => {
      let parsed;
      try {
        parsed = parseFrontmatter(raw.markdown);
      } catch (error) {
        console.error(`GROWI frontmatter parse failed: ${raw.slug}`, error);
        return null;
      }
      const { data, body } = parsed;

      if (!isPublished(data.published)) {
        return null;
      }

      return {
        slug: raw.slug,
        title: toOptionalString(data.title) ?? raw.slug,
        date: toDateString(data.date),
        summary: toOptionalString(data.summary) ?? '',
        tags: toStringList(data.tags),
        color: toOptionalString(data.color) ?? '#39C5BB',
        coverIcon: toOptionalString(data.coverIcon) ?? 'MO',
        url: getSafeUrl(data.url),
        bodyHtml: renderMarkdown(body),
      };
    })
    .filter((activity): activity is Activity => activity !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default async function ActivitiesPage() {
  const activities = await getActivities();
  const tags = Array.from(new Set(activities.flatMap((activity) => activity.tags))).sort((a, b) =>
    a.localeCompare(b, 'ja'),
  );

  return (
    <main>
      <section className="page-hero">
        <div
          style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}
          className="animate-fade-in"
        >
          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.5rem)',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              marginBottom: '1.25rem',
            }}
          >
            <span className="gradient-text">活動実績</span>
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
            Miku&apos;s Origin が制作・出展してきたライブや企画をまとめています。
          </p>
        </div>
      </section>

      <ActivitiesClient activities={activities} tags={tags} />
    </main>
  );
}
