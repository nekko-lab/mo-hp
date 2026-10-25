export type Activity = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  tags: string[];
  color: string;
  coverIcon: string;
  url?: string;
  /** サーバー側で marked + sanitize-html を通した、描画してよい HTML。 */
  bodyHtml: string;
};
