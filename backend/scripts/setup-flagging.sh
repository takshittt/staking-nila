#!/bin/bash

# Setup script for User Flagging System
# This script applies the database schema changes

echo "🚀 Setting up User Flagging System..."
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the backend directory"
    exit 1
fi

# Generate Prisma client with new schema
echo "📦 Generating Prisma client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client generated successfully"
echo ""

# Push schema changes to database
echo "🗄️  Pushing schema changes to database..."
npx prisma db push

if [ $? -ne 0 ]; then
    echo "❌ Failed to push schema changes"
    exit 1
fi

echo "✅ Schema changes applied successfully"
echo ""

echo "🎉 User Flagging System setup complete!"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Test the flagging functionality in the admin panel"
echo "3. Verify wallet connection blocking works on the frontend"
echo ""
echo "For more information, see USER_FLAGGING_SYSTEM.md"
