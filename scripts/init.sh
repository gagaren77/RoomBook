#!/bin/sh
set -e
echo "Creating database tables..."
./node_modules/.bin/prisma db push --skip-generate
echo "Seeding database..."
./node_modules/.bin/tsx prisma/seed.ts
echo "Done!"
