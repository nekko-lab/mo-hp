#!/bin/sh
set -eu

# Next.js の standalone サーバーは bind 先に $HOSTNAME を使うが、Kubernetes は
# HOSTNAME を Pod 名で上書きしてしまうため、ここで明示的に固定する。
# 外部からは nginx(:80) 経由のみで届かせたいのでループバックに bind する。
export HOSTNAME=127.0.0.1

# Alpine の nginx は /run/nginx/nginx.pid を使うので、ディレクトリを用意しておく。
mkdir -p /run/nginx

# nginx はデーモン(バックグラウンド)で起動し、PID 1 は Next.js にする。
# こうすると kubectl の停止時に SIGTERM が Next.js に届き、graceful shutdown される。
nginx

exec node server.js
