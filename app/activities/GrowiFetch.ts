import 'server-only';

export type RawActivity = {
  slug: string;
  markdown: string;
};

type ListResponse = {
  pages: { _id: string; path: string }[];
  totalCount: number;
};
type PageResponse = {
  page: { revision: { body: string } };
};

const PER_PAGE = 20;
// totalCount が想定外に大きい／返ってこない場合でも取得し続けないための上限（20件 × 10 = 200件）。
const MAX_LIST_REQUESTS = 10;
// Growi へ同時に投げる本文取得リクエストの数。
const BODY_CONCURRENCY = 5;
// Growi へのアクセスを最大1時間に1回にする（Next.js の Data Cache を利用）。
const REVALIDATE_SECONDS = 3600;

/** Growi のページパス（/activities/2025-11-fire-live）から表示用の slug を取り出す。 */
function toSlug(pagePath: string, fallbackId: string) {
  const name = pagePath.split('/').filter(Boolean).pop();

  return name ?? fallbackId;
}

export async function fetchGrowiActivities(path: string): Promise<RawActivity[]> {
  //Growiからページの情報を取得する
  const baseUrl = process.env.GROWI_HOME_URL;
  const token = process.env.GROWI_API_TOKEN;

  if (!baseUrl || !token) {
    throw new Error('GROWI_HOME_URL / GROWI_API_TOKEN が設定されていません');
  }
  // トークンはアクセスログに残らないよう、クエリ文字列ではなくヘッダでのみ送る。
  const requestInit = {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE_SECONDS },
  };

  const allPages: ListResponse['pages'] = [];
  for (let pageNum = 1; pageNum <= MAX_LIST_REQUESTS; pageNum++) {
    const params = new URLSearchParams({
      path,
      page: String(pageNum),
      limit: String(PER_PAGE),
    });
    const response = await fetch(`${baseUrl}/_api/v3/pages/list?${params}`, requestInit);
    if (!response.ok) {
      const text = await response.text();
      console.error('GROWI list error:', response.status, text.slice(0, 300));
      throw new Error(`GROWI list failed: ${response.status}`);
    }
    const data: ListResponse = await response.json();
    allPages.push(...data.pages);
    // 総件数に達した、または空ページが返ったら終了する。
    if (data.pages.length === 0 || allPages.length >= data.totalCount) break;
  }

  //一覧取得したので、そこからページごとの内容を取得する
  async function fetchBody(pageId: string): Promise<string> {
    const params = new URLSearchParams({ pageId });
    const response = await fetch(`${baseUrl}/_api/v3/page?${params}`, requestInit);

    if (!response.ok) {
      throw new Error(`GROWI page failed: ${response.status}`);
    }
    const data: PageResponse = await response.json();
    return data.page.revision.body;
  }

  const activities: RawActivity[] = [];
  // 一斉に投げると Growi の接続を使い切るため、BODY_CONCURRENCY 件ずつ取得する。
  for (let i = 0; i < allPages.length; i += BODY_CONCURRENCY) {
    const batch = allPages.slice(i, i + BODY_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((p) => fetchBody(p._id)));
    results.forEach((result, j) => {
      const page = batch[j];
      if (result.status === 'fulfilled') {
        activities.push({ slug: toSlug(page.path, page._id), markdown: result.value });
      } else {
        console.error(`GROWI page skipped: ${page.path}`, result.reason);
      }
    });
  }
  return activities;
}
