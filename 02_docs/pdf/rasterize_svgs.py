#!/usr/bin/env python3
"""Rasterize Mermaid SVGs with Chrome so Word/PDF keep arrows and Chinese labels."""

from __future__ import annotations

import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SVG_DIR = ROOT / "02_docs" / "images"
PNG_DIR = SVG_DIR / "png"
CHROME = "/opt/google/chrome/chrome"
PLAYWRIGHT = ROOT / "frontend" / "node_modules" / "playwright"


def viewbox(svg: str) -> tuple[float, float, float, float]:
    match = re.search(r'viewBox="([^"]+)"', svg)
    if not match:
        return (0, 0, 1200, 800)
    x, y, w, h = (float(part) for part in match.group(1).split())
    return x, y, w, h


def rasterize_all() -> None:
    PNG_DIR.mkdir(parents=True, exist_ok=True)
    svgs = sorted(SVG_DIR.glob("*.svg"))
    jobs = []
    with tempfile.TemporaryDirectory(prefix="svg-png-") as tmp:
        tmp_path = Path(tmp)
        for svg_path in svgs:
            svg = svg_path.read_text(encoding="utf-8")
            _x, _y, w, h = viewbox(svg)
            html = (
                "<!DOCTYPE html><html><head><meta charset='utf-8'>"
                "<style>html,body{margin:0;padding:20px;background:#fff;}"
                f"svg{{display:block;background:#fff;max-width:none!important;width:{int(w)}px!important;height:{int(h)}px!important;}}"
                "</style></head><body>"
                + svg
                + "</body></html>"
            )
            html_path = tmp_path / f"{svg_path.stem}.html"
            html_path.write_text(html, encoding="utf-8")
            png_path = PNG_DIR / f"{svg_path.stem}.png"
            jobs.append({"html": str(html_path), "png": str(png_path), "name": svg_path.name})
        spec = tmp_path / "jobs.json"
        spec.write_text(json.dumps(jobs), encoding="utf-8")
        script = tmp_path / "shot.js"
        script.write_text(
            r"""
const fs = require('fs');
const { chromium } = require(process.argv[2]);
const jobs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
(async () => {
  const browser = await chromium.launch({
    executablePath: process.argv[4],
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  for (const job of jobs) {
    await page.goto('file://' + job.html, { waitUntil: 'load', timeout: 30000 });
    const svg = page.locator('svg').first();
    await svg.waitFor({ state: 'visible' });
    await svg.screenshot({ path: job.png, type: 'png', omitBackground: false });
    const st = fs.statSync(job.png);
    console.log(job.name + ' ' + st.size);
  }
  await browser.close();
})().catch((err) => { console.error(err); process.exit(1); });
""",
            encoding="utf-8",
        )
        result = subprocess.run(
            ["node", str(script), str(PLAYWRIGHT), str(spec), CHROME],
            check=False,
            cwd=str(ROOT),
        )
        if result.returncode != 0:
            raise SystemExit(result.returncode)
        missing = [job["name"] for job in jobs if not Path(job["png"]).exists()]
        if missing:
            raise SystemExit("missing png: " + ", ".join(missing))


if __name__ == "__main__":
    rasterize_all()
