# love-archive-core — 单容器部署
#
#   docker compose up -d --build
#
# 数据落在两个卷里：/app/data（SQLite）和 /app/uploads（照片/视频）。
# 用 bookworm-slim 而不是 alpine：sharp 在 musl 上要重编译，官方 glibc 预编译包在
# Debian 上直接可用。

FROM node:20-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/love-archive.db

WORKDIR /app

# sharp 需要 ca-certificates 拉取/校验，缺了会静默降级成慢速路径
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# 先装依赖，让这层在源码改动时能命中缓存
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# NEXT_PUBLIC_* 是**构建期**注入客户端 bundle 的，只能作为 build arg 传进来。
# 留空即用 lib/config.ts 里的默认值。
ARG NEXT_PUBLIC_SITE_NAME
ARG NEXT_PUBLIC_SITE_NAME_CN
ARG NEXT_PUBLIC_SITE_SUPERTITLE
ARG NEXT_PUBLIC_SITE_TAGLINE
ARG NEXT_PUBLIC_SITE_DESCRIPTION
ARG NEXT_PUBLIC_START_DATE
ARG NEXT_PUBLIC_RELATIONSHIP_DATE
ARG NEXT_PUBLIC_AUTHOR1_NAME
ARG NEXT_PUBLIC_AUTHOR1_EMOJI
ARG NEXT_PUBLIC_AUTHOR2_NAME
ARG NEXT_PUBLIC_AUTHOR2_EMOJI

RUN npm run build

RUN mkdir -p /app/data /app/uploads

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

VOLUME ["/app/data", "/app/uploads"]

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["npm", "start"]
