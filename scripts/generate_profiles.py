"""Build the fictional county profiles and Cedar's browser dashboard."""

from __future__ import annotations

import argparse
import csv
import json
import re
from pathlib import Path


MARKER = "<!-- GENERATED: county-profiles-demo. Edit data/ or templates/, then regenerate. -->"
COUNTY_FIELDS = {"county", "population", "households", "median_household_income", "as_of", "source_name"}
SERVICE_FIELDS = {"county", "service", "provider"}


def read_csv(path: Path, required: set[str]) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        missing = required - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"{path.name} is missing columns: {', '.join(sorted(missing))}")
        return [{key: (value or "").strip() for key, value in row.items()} for row in reader]


def positive_whole_number(value: str, field: str, county: str) -> int:
    try:
        number = int(value)
    except ValueError as exc:
        raise ValueError(f"{county}: {field} must be a whole number") from exc
    if number < 0:
        raise ValueError(f"{county}: {field} cannot be negative")
    return number


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def safe_markdown(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def write_if_changed(path: Path, content: str) -> None:
    if path.exists() and path.read_text(encoding="utf-8") == content:
        return
    path.write_text(content, encoding="utf-8", newline="\n")


def generate(root: Path) -> list[Path]:
    counties = read_csv(root / "data" / "counties.csv", COUNTY_FIELDS)
    services = read_csv(root / "data" / "services.csv", SERVICE_FIELDS)
    template = (root / "templates" / "profile.md").read_text(encoding="utf-8")
    if not template.startswith(MARKER):
        raise ValueError("Template must start with the generated-file marker")

    by_name: dict[str, dict[str, str]] = {}
    slugs: set[str] = set()
    for row in counties:
        name = row["county"]
        if not name:
            raise ValueError("County names cannot be blank")
        key = name.casefold()
        slug = slugify(name)
        if key in by_name or slug in slugs or not slug:
            raise ValueError(f"Duplicate or invalid county name: {name}")
        for field in ("population", "households", "median_household_income"):
            positive_whole_number(row[field], field, name)
        if not row["as_of"] or not row["source_name"]:
            raise ValueError(f"{name}: as_of and source_name are required")
        by_name[key] = row
        slugs.add(slug)

    service_lists: dict[str, list[str]] = {key: [] for key in by_name}
    for row in services:
        key = row["county"].casefold()
        if key not in by_name:
            raise ValueError(f"Service refers to an unknown county: {row['county']}")
        if not row["service"] or not row["provider"]:
            raise ValueError(f"Service and provider are required for {row['county']}")
        service_lists[key].append(f"- {safe_markdown(row['service'])}: {safe_markdown(row['provider'])}")

    output_dir = root / "docs" / "profiles"
    output_dir.mkdir(parents=True, exist_ok=True)
    created: list[Path] = []
    for key, row in sorted(by_name.items()):
        name = row["county"]
        slug = slugify(name)
        output = output_dir / f"{slug}.md"
        values = {
            "county": safe_markdown(name),
            "population": f"{int(row['population']):,}",
            "households": f"{int(row['households']):,}",
            "median_household_income": f"${int(row['median_household_income']):,}",
            "as_of": safe_markdown(row["as_of"]),
            "source_name": safe_markdown(row["source_name"]),
            "services": "\n".join(service_lists[key]) or "No services listed in the source file.",
        }
        write_if_changed(output, template.format(**values))
        created.append(output)

    # Remove only former generated profiles, leaving any hand-written file alone.
    expected = set(created)
    for old in output_dir.glob("*.md"):
        if old not in expected and old.read_text(encoding="utf-8").startswith(MARKER):
            old.unlink()

    links = "\n".join(f"- [{row['county']}](profiles/{slugify(row['county'])}.md)" for row in sorted(counties, key=lambda r: r["county"].casefold()))
    index = f"{MARKER}\n\n# County profiles\n\nThese profiles are generated from the sample CSV files. All names and numbers are fictional.\n\n{links}\n"
    write_if_changed(root / "docs" / "index.md", index)
    build_cedar_dashboard(root, by_name)
    return created


def build_cedar_dashboard(root: Path, counties: dict[str, dict[str, str]]) -> None:
    """Write a standalone browser page from the same source files."""
    path = root / "data" / "cedar_profile.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    key = data["county"].casefold()
    if key not in counties:
        raise ValueError("The dashboard county must exist in counties.csv")
    data["facts"] = {
        field: positive_whole_number(counties[key][field], field, data["county"])
        for field in ("population", "households", "median_household_income")
    }
    if len(data["zones"]) != 12:
        raise ValueError("The schematic heat map needs exactly 12 zones")
    pa_events = sum(event["pa"] for event in data["disasters"])
    pa_categories = sum(category["amount"] for category in data["pa_categories"])
    if pa_events != pa_categories:
        raise ValueError("PA dollars by event and category must match")
    for row in data["indicators"]:
        if not (0 <= row["county"] <= 100 and 0 <= row["state"] <= 100):
            raise ValueError("Indicator percentages must be between 0 and 100")
    for row in data["hazards"]:
        if not 0 <= row["score"] <= 100:
            raise ValueError("Hazard scores must be between 0 and 100")
    template = (root / "templates" / "cedar_dashboard.html").read_text(encoding="utf-8")
    # Keep source text from closing the inline script if future data contains HTML.
    payload = json.dumps(data, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    write_if_changed(root / "docs" / "index.html", template.replace("__PROFILE_JSON__", payload))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    outputs = generate(args.root.resolve())
    print(f"Generated {len(outputs)} county profiles in {args.root.resolve() / 'docs' / 'profiles'}")
