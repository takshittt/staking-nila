#!/bin/bash

# Setup script to use the shared Prisma schema from backend

echo "🔗 Setting up shared Prisma schema..."

# Create prisma directory if it doesn't exist
mkdir -p prisma

# Create symbolic link to the backend's Prisma schema
if [ -f "../backend/prisma/schema.prisma" ]; then
  echo "✅ Found Prisma schema in backend"
  ln -sf ../../backend/prisma/schema.prisma prisma/schema.prisma
  echo "✅ Symbolic link created to schema"
else
  echo "❌ Backend Prisma schema not found at ../backend/prisma/schema.prisma"
  exit 1
fi

# Generate Prisma client
echo "📦 Generating Prisma client..."
npx prisma generate

echo "✅ Setup complete!"
echo ""
echo "You can now start the server with: npm start"
