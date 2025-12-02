#!/bin/bash
# Enhanced deal discovery script
# Runs discovery with optimized settings for maximum coverage

set -e

echo "🔍 Starting Enhanced Deal Discovery"
echo "===================================="
echo ""

# Default to 90 days back for more comprehensive discovery
DAYS_BACK=${1:-90}
SOURCE=${2:-exa}

echo "Configuration:"
echo "  Days back: $DAYS_BACK"
echo "  Source: $SOURCE"
echo ""

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    echo "✓ Activated virtual environment"
fi

# Run the discovery pipeline
cd ingestion
python3 monitor.py --days-back $DAYS_BACK --source $SOURCE

echo ""
echo "✅ Discovery complete!"
echo ""
echo "Next steps:"
echo "  1. Check the database for new deals"
echo "  2. Review extracted deals in the web interface"
echo "  3. Run again with different parameters if needed"


