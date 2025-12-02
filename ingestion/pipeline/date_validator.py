"""
Date validation and normalization utilities for ingestion pipeline
Based on formats from: Open_Problems_in_AI_Data_Economics-33.pdf (Table 4)

Supported formats from the research paper:
- Full dates: "2024-05-22", "2025-09-05"
- Year-month: "2024-05", "2025-08", "2024-11"
- Year only: "2023", "2024", "2025"
- Full year ranges: "2021-2024", "2020-2023", "2022-2025"
- Abbreviated year ranges: "2023-24", "2020-24" (from PDF Table 4)
- Half-year: "2025 H1", "2025 H2"
"""

import re
from typing import Optional, Tuple
from enum import Enum


class DateFormat(Enum):
    YYYY_MM_DD = "YYYY-MM-DD"      # Full date
    YYYY_MM = "YYYY-MM"            # Year-month
    YYYY = "YYYY"                  # Year only
    YYYY_YYYY = "YYYY-YYYY"        # Full year range
    YYYY_YY = "YYYY-YY"            # Abbreviated year range
    YYYY_H1 = "YYYY H1"            # Half-year (first half)
    YYYY_H2 = "YYYY H2"            # Half-year (second half)
    INVALID = "invalid"            # Invalid format


def validate_and_normalize_date(date_string: Optional[str]) -> Tuple[bool, Optional[str], DateFormat, Optional[str]]:
    """
    Validate and normalize a date string according to research paper formats
    
    Returns:
        (is_valid, normalized_date, format, error_message)
    """
    if not date_string or not isinstance(date_string, str):
        return (False, None, DateFormat.INVALID, "Date string is required")
    
    trimmed = date_string.strip()
    
    # 1. Half-year format: "2025 H1", "2025 H2"
    half_year_pattern = r'^(\d{4})\s+(H[12])$'
    half_year_match = re.match(half_year_pattern, trimmed, re.IGNORECASE)
    if half_year_match:
        year = int(half_year_match.group(1))
        half = half_year_match.group(2).upper()
        if 2000 <= year <= 2099:
            return (True, f"{year} {half}", 
                   DateFormat.YYYY_H1 if half == "H1" else DateFormat.YYYY_H2, None)
    
    # 2. Abbreviated year range: "2023-24", "2020-24"
    abbreviated_range_pattern = r'^(\d{4})[–-](\d{2})(?:\s|$|[^0-9])'
    abbreviated_match = re.match(abbreviated_range_pattern, trimmed)
    if abbreviated_match:
        start_year = int(abbreviated_match.group(1))
        end_year_short = int(abbreviated_match.group(2))
        # Convert 2-digit year to 4-digit (assume 2000s for years 00-99)
        end_year = 2000 + end_year_short if end_year_short < 50 else 1900 + end_year_short
        
        if (2000 <= start_year <= 2099 and 
            2000 <= end_year <= 2099 and 
            end_year >= start_year):
            return (True, f"{start_year}-{end_year_short:02d}", 
                   DateFormat.YYYY_YY, None)
    
    # 3. Full year range: "2021-2024", "2020-2023"
    year_range_pattern = r'^(\d{4})[–-](\d{4})(?:\s|$|[^0-9])'
    year_range_match = re.match(year_range_pattern, trimmed)
    if year_range_match:
        start_year = int(year_range_match.group(1))
        end_year = int(year_range_match.group(2))
        
        if (2000 <= start_year <= 2099 and 
            2000 <= end_year <= 2099 and 
            end_year >= start_year):
            return (True, f"{start_year}-{end_year}", DateFormat.YYYY_YYYY, None)
    
    # 4. ISO date format: "2024-05-22", "2025-09-05"
    iso_date_pattern = r'^(\d{4})-(\d{2})-(\d{2})$'
    iso_date_match = re.match(iso_date_pattern, trimmed)
    if iso_date_match:
        year = int(iso_date_match.group(1))
        month = int(iso_date_match.group(2))
        day = int(iso_date_match.group(3))
        
        if (2000 <= year <= 2099 and 
            1 <= month <= 12 and 
            1 <= day <= 31):
            # Validate actual date
            try:
                from datetime import datetime
                date_obj = datetime(year, month, day)
                if (date_obj.year == year and 
                    date_obj.month == month and 
                    date_obj.day == day):
                    return (True, f"{year}-{month:02d}-{day:02d}", 
                           DateFormat.YYYY_MM_DD, None)
            except ValueError:
                pass
    
    # 5. Year-month format: "2024-05", "2025-08"
    year_month_pattern = r'^(\d{4})-(\d{2})$'
    year_month_match = re.match(year_month_pattern, trimmed)
    if year_month_match:
        year = int(year_month_match.group(1))
        month = int(year_month_match.group(2))
        
        if 2000 <= year <= 2099 and 1 <= month <= 12:
            return (True, f"{year}-{month:02d}", DateFormat.YYYY_MM, None)
    
    # 6. Single year: "2023", "2024", "2025"
    single_year_pattern = r'^(\d{4})$'
    single_year_match = re.match(single_year_pattern, trimmed)
    if single_year_match:
        year = int(single_year_match.group(1))
        if 2000 <= year <= 2099:
            return (True, str(year), DateFormat.YYYY, None)
    
    # Invalid format
    return (False, None, DateFormat.INVALID, 
           f'Invalid date format: "{trimmed}". Expected formats: YYYY-MM-DD, YYYY-MM, YYYY, YYYY-YYYY, YYYY-YY, or YYYY H1/H2')


def is_valid_date(date_string: Optional[str]) -> bool:
    """Validate a date string (returns boolean)"""
    is_valid, _, _, _ = validate_and_normalize_date(date_string)
    return is_valid


def normalize_date(date_string: Optional[str]) -> Optional[str]:
    """Normalize a date string to standard format"""
    is_valid, normalized, _, _ = validate_and_normalize_date(date_string)
    return normalized if is_valid else None


