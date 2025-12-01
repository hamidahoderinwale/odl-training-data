#!/bin/bash
# Setup script for automatic Prisma client generation

set -e

echo "🔧 Setting up project..."

# Generate Node.js Prisma client
echo "📦 Generating Node.js Prisma client..."
npx prisma generate

# Generate Python Prisma client (if Python is available)
if command -v python3 &> /dev/null; then
    echo "🐍 Generating Python Prisma client..."
    cd registry
    python3 -m prisma generate 2>/dev/null || echo "⚠️  Python Prisma client generation skipped (optional)"
    cd ..
else
    echo "⚠️  Python not found, skipping Python Prisma client generation"
fi

echo "✅ Setup complete!"

