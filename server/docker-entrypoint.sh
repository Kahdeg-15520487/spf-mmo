#!/bin/sh
set -e

# Generate Prisma client (needed even if built, for the runtime engine)
npx prisma generate

# Push schema to create/update SQLite DB
npx prisma db push --skip-generate

# Seed only if DB is empty (first run)
if [ ! -f /app/prisma/dev.db ] || [ $(sqlite3 /app/prisma/dev.db "SELECT COUNT(*) FROM User;" 2>/dev/null || echo "0") = "0" ]; then
  echo "🌱 First run — seeding database..."
  npx tsx prisma/seed.ts
fi

echo "🚀 Starting SPF MMO Server..."
exec node dist/index.js
