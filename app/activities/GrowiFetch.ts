import 'server-only';

export type RawActivity = {
  slug: string;
  markdown: string;
};

type ListResponse = {
  pages: { _id: string; path: string }[];
};
type PageResponse = {
  page: { revision: { body: string } };
};

const PER_PAGE = 20;
const MAX_PAGES = 50;

/** Growi のページパス（/activities/2025-11-fire-live）から表示用の slug を取り出す。 */
function toSlug(pagePath: string, fallbackId: string) {
  const name = pagePath.split('/').filter(Boolean).pop();

  return name ?? fallbackId;
}

export async function fetchGrowiActivities(path: string): Promise<RawActivity[]> {
  //Growiからページの情報を取得する
  const baseUrl = process.env.GROWI_URL;
  const token = process.env.GROWI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('GROWI_URL / GROWI_API_TOKEN が設定されていません');
  }

  const textGet = `${baseUrl}/_api/v3/page`;
  const allPages: ListResponse['pages'] = [];
  for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
    const params = new URLSearchParams({
      access_token: token,
      path,
      page: String(pageNum),
      limit: String(PER_PAGE),
    });
    // Growi の更新を即時反映するため、Next.js の Data Cache には載せない。
    const response = await fetch(`${baseUrl}/_api/v3/pages/list?${params}`, { cache: 'no-store' });
    if (!response.ok) {
      const text = await response.text();
      console.error(
        'GROWI list error:',
        response.status,
        response.headers.get('server'),
        text.slice(0, 300),
      );
      throw new Error(`GROWI list failed: ${response.status}`);
    }
    const data: ListResponse = await response.json();
    allPages.push(...data.pages);
    if (data.pages.length < PER_PAGE) break;
  }
  //一覧取得したので、そこからページごとの内容を取得する
  async function fetchBody(pageId: string): Promise<string> {
    const params = new URLSearchParams({ access_token: token, pageId });
    const response = await fetch(`${textGet}?${params}`, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`GROWI page failed: ${response.status}`);
    }
    const data: PageResponse = await response.json();
    return data.page.revision.body;
  }
  const activities: RawActivity[] = [];
  const results = await Promise.allSettled(allPages.map((p) => fetchBody(p._id)));
  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      activities.push({ slug: toSlug(allPages[i].path, allPages[i]._id), markdown: result.value });
    } else {
      console.error(`GROWI page skipped: ${allPages[i].path}`, result.reason);
    }
  });
  return activities;
}
