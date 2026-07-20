import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import ActivitiesClient from './ActivitiesClient';
import type { Activity } from './types';

export const metadata: Metadata = {
  title: '活動実績',
  description: "Miku's Origin の活動実績・プロジェクト一覧",
};

const activitiesDir = path.join(process.cwd(), 'content', 'activities');

function parseStringList(value: string) {
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function parseFrontmatter(markdown: string) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!match) {
    return { data: {}, body: markdown };
  }

  const data = match[1].split('\n').reduce<Record<string, string | string[]>>((acc, line) => {
    const separatorIndex = line.indexOf(':');

    if (separatorIndex === -1) {
      return acc;
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    acc[key] = rawValue.startsWith('[')
      ? parseStringList(rawValue)
      : rawValue.replace(/^['"]|['"]$/g, '');

    return acc;
  }, {});

  return { data, body: match[2].trim() };
}

function getSafeUrl(value: string | string[] | undefined) {
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

function getActivities(): Activity[] {
  if (!fs.existsSync(activitiesDir)) {
    return [];
  }

  return fs
    .readdirSync(activitiesDir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const markdown = fs.readFileSync(path.join(activitiesDir, file), 'utf8');
      const { data, body } = parseFrontmatter(markdown);

      return {
        slug,
        title: String(data.title ?? slug),
        date: String(data.date ?? ''),
        summary: String(data.summary ?? ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        color: String(data.color ?? '#39C5BB'),
        coverIcon: String(data.coverIcon ?? 'MO'),
        url: getSafeUrl(data.url),
        body,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export default function ActivitiesPage() {
  const activities = getActivities();
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
