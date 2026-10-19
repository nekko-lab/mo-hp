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
// Growi へ同時に投げる本文取得リクエストの数。
const BODY_CONCURRENCY = 5;
// Growi へのアクセスを最大1日に1回にする(記事の追加時には/api/revalidateで即時にキャッシュを消去する)
const REVALIDATE_SECONDS = 86400;
//取得がうまくいかなかった場合のタイムアウト時間を設定する
const REQUEST_TIMEOUT_MS = 5000;
//全体としての締め切り時間を設ける
const TOTAL_TIMEOUT_MS = 10000;

// /api/revalidate からキャッシュを消すときに使う目印。
export const GROWI_CACHE_TAG = 'growi-activities';

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
  // 全体の締め切りを作成する
  const deadline = AbortSignal.timeout(TOTAL_TIMEOUT_MS);
  // トークンはアクセスログに残らないよう、クエリ文字列ではなくヘッダでのみ送る。
  const requestInit = {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: REVALIDATE_SECONDS, tags: [GROWI_CACHE_TAG] },
  };

  //一覧の1ページ分をとってくる
  // ① 一覧の「1ページ分」を取ってくる関数
  async function fetchList(pageNum: number): Promise<ListResponse> {
    const params = new URLSearchParams({
      path,
      page: String(pageNum),
      limit: String(PER_PAGE),
    });
    const response = await fetch(`${baseUrl}/_api/v3/pages/list?${params}`, {
      ...requestInit,
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), deadline]),
    });
    if (!response.ok) {
      throw new Error(`GROWI list page ${pageNum} failed: ${response.status}`);
    }
    return response.json();
  }

  // ② 1ページ目を取得して、総件数から総ページ数を計算する
  const first = await fetchList(1);
  const allPages: ListResponse['pages'] = [...first.pages];
  const totalPages = Math.ceil(first.totalCount / PER_PAGE);

  // ③ 残りのページ番号の配列を作る（例: totalPages が 12 なら [2, 3, ..., 12]）
  const restPageNums = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 2);

  for (let i = 0; i < restPageNums.length; i += BODY_CONCURRENCY) {
    const batch = restPageNums.slice(i, i + BODY_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((n) => fetchList(n)));
    results.forEach((result, j) => {
      if (result.status === 'fulfilled') {
        allPages.push(...result.value.pages);
      } else {
        console.error(`GROWI list page ${batch[j]} skipped`, result.reason);
      }
    });
  }
  //一覧取得したので、そこからページごとの内容を取得する
  async function fetchBody(pageId: string): Promise<string> {
    const params = new URLSearchParams({ pageId });
    const response = await fetch(`${baseUrl}/_api/v3/page?${params}`, {
      ...requestInit,
      signal: AbortSignal.any([AbortSignal.timeout(REQUEST_TIMEOUT_MS), deadline]),
    });

    if (!response.ok) {
      throw new Error(`GROWI page failed: ${response.status}`);
    }
    const data: PageResponse = await response.json();
    return data.page.revision.body;
  }

  const activities: RawActivity[] = [];
  // 一斉に投げると Growi の接続を使い切るため、BODY_CONCURRENCY 件ずつ取得する。
  for (let i = 0; i < allPages.length; i += BODY_CONCURRENCY) {
    // 全体の締め切りを過ぎたら、取れた分だけ返す（成功した記事はキャッシュされ、次の表示で残りが補われる）
    if (deadline.aborted) {
      console.error(`GROWI total timeout: ${allPages.length - i} pages not fetched`);
      break;
    }
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
