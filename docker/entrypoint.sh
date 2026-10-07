#!/bin/sh
# 容器的启动入口：数据库不存在就先初始化（建表 + 建账号），然后交给 CMD。
#
# 只判断「文件在不在」而不是每次都跑 seed——seed 用的是 INSERT OR IGNORE，
# 重复跑不会覆盖已有账号，但会白白浪费时间，而且第二次启动时它生成的随机密码
# 根本不会生效（用户看见的却是个新密码，很误导）。
set -e

DB="${DATABASE_PATH:-/app/data/love-archive.db}"

if [ ! -f "$DB" ]; then
  echo "[entrypoint] 没找到数据库（$DB），首次启动，开始初始化…"
  npx --no-install tsx lib/db/seed.ts
else
  echo "[entrypoint] 使用已有数据库：$DB"
fi

mkdir -p /app/uploads/photos /app/uploads/videos

exec "$@"
