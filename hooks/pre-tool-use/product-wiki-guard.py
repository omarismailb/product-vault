#!/usr/bin/env python3

"""Conservative sample guard for Claude Code PreToolUse hooks.

This script is intentionally small.
It shows where hard rules live: outside the model, in executable policy.
"""

import json
import re
import sys


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except Exception:
        return 0

    tool_name = payload.get("tool_name") or payload.get("tool") or ""
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    text = json.dumps(tool_input)

    blocked = [
        r"rm\s+-rf\s+/",
        r"git\s+reset\s+--hard",
        r"git\s+push\s+--force",
    ]

    for pattern in blocked:
        if re.search(pattern, text):
            print(f"Blocked dangerous command by Product Wiki guard: {pattern}", file=sys.stderr)
            return 2

    if tool_name in {"Write", "Edit", "MultiEdit"} and "wiki/" in text and "intake/proposals" not in text:
        # This is advisory in the scaffold. Teams can tighten it once they know their workflow.
        print(
            "Product Wiki note: wiki edits should normally come from an approved proposal.",
            file=sys.stderr,
        )
        return 0

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

