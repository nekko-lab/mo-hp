ARG NODE_VERSION=24.13.0

################################################################################

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

################################################################################

FROM base AS deps

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

################################################################################

FROM deps AS build

COPY . .

RUN npm run build

################################################################################
# Growi から動的に取得するため、静的配信ではなく Next.js サーバー(:3000)を動かし、
# nginx(:80) をその前段のリバースプロキシとして同居させる。
# ネイティブモジュールの libc を揃えるため、runner も build と同じ alpine を使う。

FROM base AS runner

ENV NODE_ENV=production
ENV PORT=3000

# Alpine の nginx は /etc/nginx/http.d/*.conf を読み込む（Debian 版の conf.d に相当）
RUN apk add --no-cache nginx && rm -f /etc/nginx/http.d/*.conf
COPY container/nginx/conf.d/*.conf /etc/nginx/http.d/

# standalone には .next/static と public が含まれないため個別にコピーする
COPY --from=build /usr/src/app/.next/standalone ./
COPY --from=build /usr/src/app/.next/static ./.next/static
COPY --from=build /usr/src/app/public ./public

COPY container/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 80

CMD ["/usr/local/bin/entrypoint.sh"]
