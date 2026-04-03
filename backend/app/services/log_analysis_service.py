from datetime import datetime
from typing import Iterable


THREAT_PATTERNS = {
    "FAILED LOGIN": "authentication",
    "SQL INJECTION": "injection",
    "XSS": "injection",
    "RATE LIMIT": "abuse",
    "FORBIDDEN": "authorization",
    "UNAUTHORIZED": "authorization",
}


def parse_log_timestamp(line: str) -> datetime | None:
    # Example expected prefix: 2026-04-04T10:30:00Z ...
    first_token = line.strip().split(" ")[0]
    try:
        return datetime.fromisoformat(first_token.replace("Z", "+00:00"))
    except Exception:
        return None


def process_logs(
    lines: Iterable[str],
    keyword: str | None = None,
    start_ts: datetime | None = None,
    end_ts: datetime | None = None,
) -> list[dict]:
    results: list[dict] = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue

        ts = parse_log_timestamp(line)
        if start_ts and ts and ts < start_ts:
            continue
        if end_ts and ts and ts > end_ts:
            continue
        if keyword and keyword.lower() not in line.lower():
            continue

        category = None
        for pattern, threat_type in THREAT_PATTERNS.items():
            if pattern in line.upper():
                category = threat_type
                break

        if not category and "FAILED LOGIN" not in line.upper():
            continue

        results.append({
            "timestamp": ts.isoformat() if ts else None,
            "category": category or "authentication",
            "line": line,
        })

    return results