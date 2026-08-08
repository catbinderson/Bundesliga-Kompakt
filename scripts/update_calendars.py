#!/usr/bin/env python3
"""Erzeugt abonnierbare Vereinskalender aus den aktuellen OpenLigaDB-Daten."""

import concurrent.futures
import datetime as dt
import json
import pathlib
import urllib.request
from zoneinfo import ZoneInfo

API = "https://api.openligadb.de"
LEAGUE = "bl1"
SEASON = 2026
OUTPUT = pathlib.Path(__file__).resolve().parents[1] / "calendars"
BERLIN = ZoneInfo("Europe/Berlin")


def get(path):
    request = urllib.request.Request(
        API + path, headers={"User-Agent": "LigaKompakt-calendar-updater"}
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def escape(value=""):
    return (
        str(value or "")
        .replace("\\", "\\\\")
        .replace("\n", "\\n")
        .replace(",", "\\,")
        .replace(";", "\\;")
    )


def utc_stamp(value):
    if value:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=BERLIN)
    else:
        parsed = dt.datetime(2026, 8, 8, tzinfo=dt.timezone.utc)
    return parsed.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def build(team):
    team_id = team["teamId"]
    matches = get(f"/getmatchesbyteamid/{team_id}/0/34")
    upcoming = [match for match in matches if not match.get("matchIsFinished")]
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//LigaKompakt//Andreas Binder//DE",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{escape('LigaKompakt · ' + team['teamName'])}",
        "X-WR-TIMEZONE:Europe/Berlin",
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
        "X-PUBLISHED-TTL:PT6H",
    ]
    for match in upcoming:
        start = dt.datetime.fromisoformat(match["matchDateTime"]).replace(tzinfo=BERLIN)
        end = start + dt.timedelta(hours=2)
        home = match.get("team1", {}).get("teamName", "Heimteam")
        away = match.get("team2", {}).get("teamName", "Auswärtsteam")
        location = match.get("location") or {}
        venue = ", ".join(
            value
            for value in [
                location.get("locationStadium"),
                location.get("locationCity"),
            ]
            if value
        )
        lines.extend(
            [
                "BEGIN:VEVENT",
                f"UID:ligakompakt-{match.get('matchID', int(start.timestamp()))}@andreas-binder",
                f"DTSTAMP:{utc_stamp(match.get('lastUpdateDateTime'))}",
                f"DTSTART:{utc_stamp(match['matchDateTime'])}",
                f"DTEND:{end.astimezone(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')}",
                f"SUMMARY:{escape(home + ' – ' + away)}",
                "DESCRIPTION:Bundesliga-Spiel · LigaKompakt",
                f"LOCATION:{escape(venue)}",
                "URL:https://catbinderson.github.io/Bundesliga-Kompakt/",
                "END:VEVENT",
            ]
        )
    lines.append("END:VCALENDAR")
    (OUTPUT / f"{team_id}.ics").write_text(
        "\r\n".join(lines) + "\r\n", encoding="utf-8", newline=""
    )


def main():
    OUTPUT.mkdir(exist_ok=True)
    teams = get(f"/getavailableteams/{LEAGUE}/{SEASON}")
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        list(executor.map(build, teams))
    expected = {f"{team['teamId']}.ics" for team in teams}
    for calendar in OUTPUT.glob("*.ics"):
        if calendar.name not in expected:
            calendar.unlink()
    print(f"{len(teams)} Vereinskalender aktualisiert.")


if __name__ == "__main__":
    main()
