import { timingSafeEqual } from 'node:crypto';
import { revalidateTag } from 'next/cache';
import { GROWI_CACHE_TAG } from '../../activities/GrowiFetch';

/** 長さが違っても例外を投げず、かかる時間で中身を推測されないように比較する。 */
function isSameSecret(given: string, expected: string) {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.error('REVALIDATE_SECRET が設定されていません');
    return Response.json({ revalidated: false }, { status: 500 });
  }

  const given = request.headers.get('x-revalidate-secret') ?? '';
  if (!isSameSecret(given, secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  revalidateTag(GROWI_CACHE_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
