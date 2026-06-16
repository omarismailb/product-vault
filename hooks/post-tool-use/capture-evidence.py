#!/usr/bin/env python3

"""Append lightweight hook evidence for local debugging."""

import datetime as dt
import json
import os
import sys


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        payload = {}

    os.makedirs(".product-wiki", exist_ok=True)
    event = {
        "at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "tool": payload.get("tool_name") or payload.get("tool") or "unknown",
    }
    with open(".product-wiki/hook-events.jsonl", "a", encoding="utf8") as handle:
        handle.write(json.dumps(event) + "\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

