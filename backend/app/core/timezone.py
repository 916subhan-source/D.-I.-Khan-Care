"""
Centralized Pakistan Standard Time (PKT, UTC+5) timezone helpers.
Ensures appointment slots, doctor schedules, and digital slips display
the exact local clinic time across all endpoints and services.
"""

from datetime import datetime, timezone, timedelta
from typing import Optional, Union

# Pakistan Standard Time (PKT) is UTC+5 (D.I. Khan, Pakistan)
PKT = timezone(timedelta(hours=5))

def to_pkt(dt: Optional[Union[datetime, str]]) -> Optional[datetime]:
    """Convert a UTC or naive datetime (or ISO string) to Pakistan Standard Time."""
    if dt is None:
        return None
    if isinstance(dt, str):
        try:
            # Handle ISO string format
            dt = datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except Exception:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(PKT)

def format_pkt_date(dt: Optional[Union[datetime, str]]) -> Optional[str]:
    """
    Format datetime as human-friendly date in PKT: 'Thu, 15 Oct 2026'.
    """
    p = to_pkt(dt)
    if not p:
        return None
    return p.strftime("%a, %d %b %Y")

def format_pkt_time(dt: Optional[Union[datetime, str]], strip_leading_zero: bool = True) -> Optional[str]:
    """
    Format datetime as 12-hour clinic time in PKT: '5:40 AM' or '05:40 AM'.
    """
    p = to_pkt(dt)
    if not p:
        return None
    if strip_leading_zero:
        hour_str = str(int(p.strftime("%I")))
        return f"{hour_str}:{p.strftime('%M %p')}"
    return p.strftime("%I:%M %p")

def format_pkt_ymd(dt: Optional[Union[datetime, str]]) -> Optional[str]:
    """Format datetime as 'YYYYMMDD' in PKT for digital slip numbers."""
    p = to_pkt(dt)
    if not p:
        return None
    return p.strftime("%Y%m%d")
