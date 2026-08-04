#!/usr/bin/env python3
"""Stream CQC's "Latest ratings" .ods file (Locations sheet) into a small CSV
of one overall rating per location: cqc_location_id, overall_rating, rating_date.

The .ods "Locations" sheet is tidy/long-format: one row per (location, domain)
pair (Safe/Effective/Caring/Responsive/Well-led/Overall). We only keep rows
where Domain == "Overall" and Service / Population Group == "Overall", since
that is the single headline rating shown for a location.

Usage: python3 scripts/convert-cqc-ratings.py /path/to/Latest_ratings.ods /path/to/output.csv [--limit N]
"""

import csv
import sys
import zipfile
import xml.etree.ElementTree as ET

TABLE_NS = "urn:oasis:names:tc:opendocument:xmlns:table:1.0"
TABLE_NAME_ATTR = f"{{{TABLE_NS}}}name"
COLUMNS_REPEATED_ATTR = f"{{{TABLE_NS}}}number-columns-repeated"

# 0-indexed column positions in the "Locations" sheet header row.
COL_LOCATION_ID = 0
COL_POPULATION_GROUP = 17
COL_DOMAIN = 18
COL_LATEST_RATING = 19
COL_PUBLICATION_DATE = 20


def cell_text(cell):
    return "".join(cell.itertext()).strip()


def iter_rows(ods_path, table_name):
    with zipfile.ZipFile(ods_path) as zf:
        with zf.open("content.xml") as f:
            context = ET.iterparse(f, events=("start", "end"))
            in_target_table = False
            for event, elem in context:
                tag = elem.tag.rsplit("}", 1)[-1]
                if event == "start" and tag == "table":
                    in_target_table = elem.get(TABLE_NAME_ATTR) == table_name
                elif event == "end" and tag == "table-row" and in_target_table:
                    row = []
                    for cell in elem:
                        ctag = cell.tag.rsplit("}", 1)[-1]
                        if ctag not in ("table-cell", "covered-table-cell"):
                            continue
                        repeat = int(cell.get(COLUMNS_REPEATED_ATTR, "1"))
                        row.extend([cell_text(cell)] * repeat)
                    yield row
                    elem.clear()
                elif event == "end" and tag == "table":
                    elem.clear()


def convert_date(raw):
    # CQC dates come as DD/MMM/YYYY or DD/MM/YYYY; normalize to YYYY-MM-DD.
    if not raw:
        return ""
    parts = raw.split("/")
    if len(parts) != 3:
        return ""
    day, month, year = parts
    months = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04",
        "May": "05", "Jun": "06", "Jul": "07", "Aug": "08",
        "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12",
    }
    month = months.get(month, month.zfill(2))
    return f"{year}-{month}-{day.zfill(2)}"


def main():
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    ods_path = sys.argv[1]
    out_path = sys.argv[2]
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    written = 0
    seen_locations = set()
    with open(out_path, "w", newline="") as out_file:
        writer = csv.writer(out_file)
        writer.writerow(["cqc_location_id", "overall_rating", "rating_date"])

        for i, row in enumerate(iter_rows(ods_path, "Locations")):
            if i == 0:
                continue  # header row
            if len(row) <= COL_PUBLICATION_DATE:
                continue

            location_id = row[COL_LOCATION_ID]
            population_group = row[COL_POPULATION_GROUP]
            domain = row[COL_DOMAIN]
            rating = row[COL_LATEST_RATING]

            if domain != "Overall" or population_group != "Overall":
                continue
            if not location_id or not rating:
                continue
            if location_id in seen_locations:
                continue
            seen_locations.add(location_id)

            writer.writerow([location_id, rating, convert_date(row[COL_PUBLICATION_DATE])])
            written += 1

            if written % 5000 == 0:
                print(f"\rConverted {written} ratings...", end="", file=sys.stderr)

            if limit and written >= limit:
                break

    print(f"\rConverted {written} ratings. Wrote {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
