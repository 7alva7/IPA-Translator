#!/usr/bin/env python3
"""
Fix chunk 5: Extract clean graphify JSON.

Two approaches:
1. Try problem.jsonl line 76 (Write tool call) - extract minified graph JSON
2. Fall back to expand-clean.jsonl - reconstruct from pretty-printed data

The expand-clean file has unquoted line ranges like "line":7-15 that need fixing.
"""

import json, re, os, sys

os.chdir("/Users/FJ/git/IPA-Translator")

problem_path = "chunk5_json_raw/agent-a9a-problem.jsonl"
expand_path = "chunk5_json_raw/agent-a9a-problem-expand-clean.jsonl"
output_path = ".graphify_chunk5.json"

graph_json = None

###############################################
# Approach 1: Extract from problem.jsonl line 76
###############################################
with open(problem_path) as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    obj = json.loads(line)
    msgs = obj.get("message", {}).get("content", [])
    for msg in msgs:
        if isinstance(msg, dict) and msg.get("type") == "tool_use":
            inp = msg.get("input", {})
            fp = inp.get("file_path", "")
            if "graphify_chunk5" in fp:
                content = inp.get("content", "")
                print(f"[1] Found Write tool at line {i}, content len = {len(content)}")
                try:
                    graph_json = json.loads(content)
                    print("    -> Direct parse SUCCESS")
                except json.JSONDecodeError as e:
                    print(f"    -> Direct parse FAIL at pos {e.pos}: {e.msg}")

if graph_json:
    n = len(graph_json.get("nodes", []))
    e = len(graph_json.get("edges", []))
    h = len(graph_json.get("hyperedges", []))
    print(f"[1] Parsed: {n} nodes, {e} edges, {h} hyperedges")
else:
    print("[1] Not found, falling back to expand-clean...")

###############################################
# Approach 2: Reconstruct from expand-clean
###############################################
if not graph_json:
    with open(expand_path) as f:
        raw = f.read()

    # Split into JSONL records by tracking brace depth
    records = []
    current = []
    depth = 0

    for line in raw.split('\n'):
        stripped = line.strip()
        if not stripped:
            continue
        for ch in stripped:
            current.append(ch)
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
        current.append('\n')

        if depth <= 0 and current:
            records.append(''.join(current))
            current = []
            depth = 0

    print(f"[2] Found {len(records)} records in expand-clean")

    # Find the toolUseResult record (last one)
    for idx, rec in enumerate(records):
        if '"toolUseResult"' not in rec:
            continue

        print(f"[2] Record {idx} has toolUseResult ({len(rec)} chars)")

        # Fix unquoted line ranges: "line":7-15 -> "line":"7-15"
        fixed_rec = re.sub(r'"line":(\d+)-(\d+)(?=[,\s\}\]])', r'"line":"\1-\2"', rec)

        # Also fix unquoted single-number lines if any: "line":127, -> leave as-is (valid JSON number)

        try:
            obj = json.loads(fixed_rec)
            tr = obj.get("toolUseResult", {})
            content_obj = tr.get("content")
            if isinstance(content_obj, dict) and "nodes" in content_obj:
                graph_json = content_obj
                print(f"[2] Parsed! {len(graph_json['nodes'])} nodes, {len(graph_json['edges'])} edges")
                break
        except json.JSONDecodeError as e:
            print(f"[2] Parse failed at pos {e.pos}: {e.msg}")
            ctx = fixed_rec[max(0, e.pos-40):e.pos+40]
            print(f"     Context: {repr(ctx)}")

###############################################
# Save result
###############################################
if graph_json:
    nodes = graph_json.get("nodes", [])
    edges = graph_json.get("edges", [])
    hyper = graph_json.get("hyperedges", [])
    print(f"\nFinal: {len(nodes)} nodes, {len(edges)} edges, {len(hyper)} hyperedges")

    with open(output_path, "w") as f:
        json.dump(graph_json, f, indent=2)
    print(f"Saved to {output_path}")

    # Verify edge structure
    weighted = [e for e in edges if "weight" in e]
    print(f"Edges with weight: {len(weighted)}")

    # Show sample edge
    if edges:
        print(f"Sample edge: {json.dumps(edges[0], indent=2)[:300]}")
else:
    print("\nFAILED - could not extract graph JSON")
    sys.exit(1)
