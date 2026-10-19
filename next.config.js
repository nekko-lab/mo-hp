/** @type {import('next').NextConfig} */
const nextConfig = {
  // Growi から動的に取得するため、静的書き出し（output: 'export'）ではなく
  // Node サーバーとして動かす。standalone は Docker 向けの最小構成を出力する。
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
