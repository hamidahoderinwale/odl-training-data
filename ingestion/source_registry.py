"""
Source Registry - Central registry of data sources to scrape
"""

from dataclasses import dataclass
from typing import Optional, List
from enum import Enum


class SourceType(Enum):
    NEWS = "news"
    FILING = "filing"
    PRESS_RELEASE = "press_release"
    RSS = "rss"
    TRACKER = "tracker"


@dataclass
class Source:
    """Represents a data source configuration"""
    name: str
    base_url: str
    source_type: SourceType
    rss_feed: Optional[str] = None
    css_selectors: Optional[dict] = None  # e.g., {"title": ".article-title", "content": ".article-body"}
    api_endpoint: Optional[str] = None
    headers: Optional[dict] = None
    enabled: bool = True
    priority: int = 5  # 1-10, higher = more important


# News Outlets
NEWS_SOURCES = [
    Source(
        name="Reuters",
        base_url="https://www.reuters.com",
        source_type=SourceType.NEWS,
        rss_feed="https://www.reuters.com/tools/rss",
        priority=9,
    ),
    Source(
        name="Bloomberg",
        base_url="https://www.bloomberg.com",
        source_type=SourceType.NEWS,
        priority=9,
    ),
    Source(
        name="Financial Times",
        base_url="https://www.ft.com",
        source_type=SourceType.NEWS,
        priority=8,
    ),
    Source(
        name="Axios",
        base_url="https://www.axios.com",
        source_type=SourceType.NEWS,
        rss_feed="https://api.axios.com/feed/",
        priority=7,
    ),
    Source(
        name="The Verge",
        base_url="https://www.theverge.com",
        source_type=SourceType.NEWS,
        rss_feed="https://www.theverge.com/rss/index.xml",
        priority=7,
    ),
    Source(
        name="WIRED",
        base_url="https://www.wired.com",
        source_type=SourceType.NEWS,
        rss_feed="https://www.wired.com/feed/rss",
        priority=7,
    ),
    Source(
        name="TechCrunch",
        base_url="https://techcrunch.com",
        source_type=SourceType.NEWS,
        rss_feed="https://techcrunch.com/feed/",
        priority=8,
    ),
    Source(
        name="Music Business Worldwide",
        base_url="https://www.musicbusinessworldwide.com",
        source_type=SourceType.NEWS,
        priority=6,
    ),
    Source(
        name="PetaPixel",
        base_url="https://petapixel.com",
        source_type=SourceType.NEWS,
        rss_feed="https://petapixel.com/feed/",
        priority=5,
    ),
]

# Press Release Sources
PRESS_RELEASE_SOURCES = [
    Source(
        name="OpenAI Blog",
        base_url="https://openai.com/blog",
        source_type=SourceType.PRESS_RELEASE,
        rss_feed="https://openai.com/blog/rss.xml",
        priority=9,
    ),
    Source(
        name="Google AI Blog",
        base_url="https://ai.googleblog.com",
        source_type=SourceType.PRESS_RELEASE,
        priority=8,
    ),
    Source(
        name="Meta AI",
        base_url="https://ai.meta.com/blog",
        source_type=SourceType.PRESS_RELEASE,
        priority=8,
    ),
    Source(
        name="Anthropic",
        base_url="https://www.anthropic.com/news",
        source_type=SourceType.PRESS_RELEASE,
        priority=8,
    ),
    Source(
        name="Microsoft AI",
        base_url="https://www.microsoft.com/en-us/research/blog",
        source_type=SourceType.PRESS_RELEASE,
        priority=7,
    ),
    Source(
        name="HarperCollins",
        base_url="https://www.harpercollins.com/news",
        source_type=SourceType.PRESS_RELEASE,
        priority=6,
    ),
    Source(
        name="Wiley",
        base_url="https://www.wiley.com/en-us/news",
        source_type=SourceType.PRESS_RELEASE,
        priority=6,
    ),
    Source(
        name="News Corp",
        base_url="https://newscorp.com/news",
        source_type=SourceType.PRESS_RELEASE,
        priority=7,
    ),
]

# Filing Sources
FILING_SOURCES = [
    Source(
        name="SEC EDGAR",
        base_url="https://www.sec.gov/edgar",
        source_type=SourceType.FILING,
        api_endpoint="https://data.sec.gov/api/xbrl",
        priority=9,
    ),
    Source(
        name="SEDAR",
        base_url="https://www.sedar.com",
        source_type=SourceType.FILING,
        priority=7,
    ),
]

# Industry Trackers
TRACKER_SOURCES = [
    Source(
        name="CB Insights",
        base_url="https://www.cbinsights.com",
        source_type=SourceType.TRACKER,
        priority=8,
    ),
    Source(
        name="Appen",
        base_url="https://appen.com",
        source_type=SourceType.TRACKER,
        priority=6,
    ),
]

# Exa Search Queries (for intelligent retrieval)
EXA_SEARCH_QUERIES = [
    "OpenAI licensing",
    "Anthropic licensing",
    "training data deal",
    "content licensing AI",
    "publisher AI model agreement",
    "data partnership",
    "AI dataset licensing",
    "media archive deal OpenAI",
    "exclusive AI rights",
    "API access licensing",
    "settlement AI training",
    "Microsoft AI data licensing",
    "Google AI content deal",
    "Meta AI training data",
    "music AI licensing",
    "image AI training data",
    "video AI dataset",
    "satellite AI data",
    "biotech AI training",
]


def get_all_sources() -> List[Source]:
    """Get all enabled sources"""
    all_sources = (
        NEWS_SOURCES +
        PRESS_RELEASE_SOURCES +
        FILING_SOURCES +
        TRACKER_SOURCES
    )
    return [s for s in all_sources if s.enabled]


def get_sources_by_type(source_type: SourceType) -> List[Source]:
    """Get sources filtered by type"""
    return [s for s in get_all_sources() if s.source_type == source_type]


def get_high_priority_sources(threshold: int = 7) -> List[Source]:
    """Get sources with priority >= threshold"""
    return [s for s in get_all_sources() if s.priority >= threshold]

