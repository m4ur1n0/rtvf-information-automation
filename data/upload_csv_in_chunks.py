import csv
import json
import io
import sys
import requests
import time

WORKER_URL = "https://long-recipe-3816.theomaurino2026.workers.dev"
SECRET = "0c7cfdd8-fdc7-4ecc-ab25-841aa8f0a8aa"
CSV_PATH = "./rtvf_data.csv"
CHUNK_SIZE = 150
SLEEP_SEC = 0.2

endpoint = f"{WORKER_URL}/webhook/email"

with open(CSV_PATH, newline="", encoding="utf-8") as f:
    reader = csv.reader(f)
    header = next(reader)

    total = 0
    ok = 0
    failed = 0
    chunk = []

    def send(rows):
        global ok, failed
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(header)
        w.writerows(rows)

        resp = requests.post(
            endpoint,
            headers={
                "Content-Type": "text/csv",
                "X-Webhook-Secret": SECRET,
            },
            data=buf.getvalue().encode("utf-8"),
            timeout=60,
        )

        if resp.ok:
            j = resp.json()
            ok += j["inserted"]
            print(f"✓ uploaded {len(rows)} rows (status {resp.status_code})\n{json.dumps(j)}\n")

            if (j["inserted"] == 0 and j["skippedOld"] > 100):
                exit(0)
        else:
            failed += len(rows)
            print(f"✗ FAILED {len(rows)} rows → {resp.status_code}")
            print(resp.text[:300])

    for row in reader:
        chunk.append(row)
        total += 1

        if len(chunk) >= CHUNK_SIZE:
            send(chunk)
            chunk = []
            if SLEEP_SEC:
                time.sleep(SLEEP_SEC)

    if chunk:
        send(chunk)

print(f"\nDone. Total rows: {total}, Uploaded: {ok}, Failed: {failed}")
