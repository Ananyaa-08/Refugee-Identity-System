#!/usr/bin/env python3
"""
Render diagrams/*.mmd to diagrams/png/ and diagrams/svg/.

Uses local @mermaid-js/mermaid-cli (npx mmdc) — no external API required.
Requires Node.js; first run may download Chromium via Puppeteer.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIAGRAMS = ROOT / "diagrams"
MMDC_PKG = "@mermaid-js/mermaid-cli@11.4.0"


def _find_npx() -> str:
    npx = shutil.which("npx")
    if not npx:
        raise SystemExit("npx not found. Install Node.js: https://nodejs.org/")
    return npx


def render_one(npx: str, mmd: Path, out_file: Path, fmt: str) -> None:
    """Render a single .mmd file with mmdc."""
    out_file.parent.mkdir(parents=True, exist_ok=True)
    # mmdc picks format from extension (.png / .svg)
    cmd = [
        npx,
        "--yes",
        MMDC_PKG,
        "-i",
        str(mmd.resolve()),
        "-o",
        str(out_file.resolve()),
        "-b",
        "transparent",
    ]
    if fmt == "png":
        cmd.extend(["-w", "1920", "-H", "1080"])
    result = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    if result.returncode != 0:
        stderr = (result.stderr or result.stdout or "").strip()
        raise RuntimeError(f"mmdc failed for {mmd.name}:\n{stderr}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Render RIMS Mermaid diagrams")
    parser.add_argument(
        "--only",
        help="Comma-separated diagram stems (e.g. 01-three-layer-architecture)",
    )
    args = parser.parse_args()

    png_dir = DIAGRAMS / "png"
    svg_dir = DIAGRAMS / "svg"
    png_dir.mkdir(parents=True, exist_ok=True)
    svg_dir.mkdir(parents=True, exist_ok=True)

    only = {s.strip() for s in args.only.split(",")} if args.only else None
    mmd_files = sorted(DIAGRAMS.glob("*.mmd"))
    if only:
        mmd_files = [p for p in mmd_files if p.stem in only]
    if not mmd_files:
        raise SystemExit(f"No .mmd files to render in {DIAGRAMS}")

    npx = _find_npx()
    print(f"Using local mermaid-cli via npx ({MMDC_PKG})\n")

    errors: list[str] = []
    for mmd in mmd_files:
        name = mmd.stem
        print(f"Rendering {name}...")
        for fmt, out_dir in (("png", png_dir), ("svg", svg_dir)):
            out = out_dir / f"{name}.{fmt}"
            try:
                render_one(npx, mmd, out, fmt)
                size = out.stat().st_size if out.exists() else 0
                print(f"  -> {out.relative_to(ROOT)} ({size} bytes)")
            except RuntimeError as e:
                errors.append(str(e))
                print(f"  !! failed {fmt}: {e}", file=sys.stderr)

    if errors:
        raise SystemExit(f"{len(errors)} render step(s) failed.")
    print(f"\nDone. {len(mmd_files)} diagram(s) × 2 formats.")


if __name__ == "__main__":
    main()
