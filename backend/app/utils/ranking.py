from datetime import date, timedelta


def average_rating(event) -> float:
    """
    Compute average rating for an event.
    """
    if not event.ratings:
        return 0.0
    return round(sum(r.value for r in event.ratings) / len(event.ratings), 2)


def keyword_score(query: str, title: str, description: str) -> int:
    """
    Give extra weight to events whose title/description matches search terms.
    """
    if not query:
        return 0

    q_words = [w.strip().lower() for w in query.split() if w.strip()]
    haystack = f"{title} {description}".lower()

    return sum(3 if word in title.lower() else 1 for word in q_words if word in haystack)


def date_priority_boost(event_date_value) -> int:
    """
    Rank events by how soon/relevant they are according to your business rule:

    Priority order:
    1. Happening this week / weekend
    2. Happening this month
    3. Happening later this year
    4. Future next year / far future
    5. Past events (lowest)

    This function returns a boost that gets added into the overall ranking score.
    """
    if not event_date_value:
        return 0

    today = date.today()

    # Sunday end-of-week assumption
    days_to_sunday = 6 - today.weekday()
    end_of_week = today + timedelta(days=days_to_sunday)

    if event_date_value < today:
        return -60

    if today <= event_date_value <= end_of_week:
        return 60

    if event_date_value.year == today.year and event_date_value.month == today.month:
        return 40

    if event_date_value.year == today.year:
        return 20

    return 5


def ranking_score(
    event,
    query: str | None = None,
    user_lat: float | None = None,
    user_lon: float | None = None
) -> tuple[float, float | None]:
    """
    Blend:
    - average rating
    - keyword relevance
    - event date priority

    Distance is no longer used because latitude/longitude have been removed
    from the event model to match customer behavior.
    """
    avg = average_rating(event)
    key = keyword_score(query or "", event.title, event.description)
    time_boost = date_priority_boost(event.event_date)

    score = (avg * 20) + (key * 5) + time_boost

    # Distance is no longer relevant in this product version.
    return round(score, 2), None