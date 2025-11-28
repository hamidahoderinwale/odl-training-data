"""
Configuration for ingestion pipeline
"""

import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
EXA_API_KEY = os.getenv("EXA_API_KEY")
PERPLEXITY_API_KEY = os.getenv("PERPLEXITY_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# Scraping settings
SCRAPE_TIMEOUT = 30
SCRAPE_RETRIES = 3
SCRAPE_DELAY = 1  # seconds between requests

# LLM settings
PERPLEXITY_MODEL = "llama-3.1-sonar-large-128k-online"
PERPLEXITY_TEMPERATURE = 0.2

# Validation
MIN_CONFIDENCE_SCORE = 0.5  # Minimum confidence to save a deal

