import holidays
from datetime import date
from typing import Set


def get_national_holidays(country_code: str, start_year: int, end_year: int) -> Set[date]:
    """Return a set of national holiday dates for the given country."""
    try:
        holiday_class = getattr(holidays, country_code.upper())
        holiday_obj = holiday_class(years=range(start_year, end_year + 1))
        return set(holiday_obj.keys())
    except Exception:
        return set()


# Convenience wrapper for Côte d'Ivoire

def get_ci_holidays(start_year: int, end_year: int) -> Set[date]:
    return get_national_holidays("CI", start_year, end_year)
