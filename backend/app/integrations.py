import requests

from .config import settings


def push_to_google_tasks(title: str, description: str, deadline, assignee_names: list[str]) -> None:
    if not settings.gtasks_url or not settings.gtasks_api_key:
        return
    body = {"title": title}
    notes = ""
    if assignee_names:
        notes = "Assigned to: " + ", ".join(assignee_names)
    if description:
        notes = f"{notes}\n\n{description}" if notes else description
    if notes:
        body["notes"] = notes
    if deadline:
        body["due"] = deadline.isoformat()
    try:
        requests.post(
            f"{settings.gtasks_url.rstrip('/')}/tasks",
            json=body,
            headers={"X-API-Key": settings.gtasks_api_key},
            timeout=5,
        )
    except requests.RequestException:
        pass
