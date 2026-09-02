#!/usr/bin/env python3
"""Export selected Markdown delivery docs to PDF with embedded CJK fonts."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "02_docs" / "pdf"
FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"

DOCUMENTS = [
    ROOT / "02_docs" / "软件需求规格说明书.md",
    ROOT / "02_docs" / "软件概要设计说明书.md",
    ROOT / "02_docs" / "软件详细设计说明书.md",
    ROOT / "02_docs" / "业务场景用例清单与追溯表.md",
    ROOT / "02_docs" / "测试文档.md",
    ROOT / "04_tests" / "reports" / "tests" / "测试报告-小学期.md",
    ROOT / "02_docs" / "微服务接口与数据归属.md",
    ROOT / "04_tests" / "reports" / "performance" / "性能对比实验报告.md",
    ROOT / "06_defense" / "技术总结报告.md",
]


def wrap_text(pdf: FPDF, text: str, size: int, height: float) -> None:
    pdf.set_font("Hei", size=size)
    pdf.set_x(pdf.l_margin)
    cleaned = text.replace("\t", "  ")
    if not cleaned.strip():
        pdf.ln(height / 2)
        return
    usable = pdf.w - pdf.l_margin - pdf.r_margin
    pdf.multi_cell(usable, height, cleaned)


def render_markdown(pdf: FPDF, source: str) -> None:
    lines = source.replace("\r\n", "\n").split("\n")
    i = 0
    in_code = False
    code_lines: list[str] = []
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            if in_code:
                wrap_text(pdf, "\n".join(code_lines), 8, 4)
                code_lines = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_lines.append(line)
            i += 1
            continue
        if re.match(r"^\s*\|.*\|\s*$", line):
            table = []
            while i < len(lines) and re.match(r"^\s*\|.*\|\s*$", lines[i]):
                row = [cell.strip() for cell in lines[i].strip().strip("|").split("|")]
                if not all(re.match(r"^:?-+:?$", cell or "") for cell in row):
                    table.append(" | ".join(row))
                i += 1
            wrap_text(pdf, "\n".join(table), 8, 4)
            continue
        heading = re.match(r"^(#{1,6})\s+(.*)$", line)
        if heading:
            level = len(heading.group(1))
            size = max(16 - level, 11)
            wrap_text(pdf, heading.group(2).strip(), size, 7)
            i += 1
            continue
        image = re.search(r"!\[[^\]]*\]\(([^)]+)\)", line)
        if image:
            wrap_text(pdf, f"【图文件见仓库：{image.group(1)}。矢量图在 02_docs/images 与 models。】", 9, 5)
            i += 1
            continue
        text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", line)
        text = re.sub(r"[`*_>]", "", text)
        wrap_text(pdf, text, 10, 5)
        i += 1


def to_pdf(md_path: Path) -> Path:
    pdf_path = OUT_DIR / f"{md_path.stem}.pdf"
    pdf = FPDF(format="A4", unit="mm")
    pdf.set_margins(16, 16, 16)
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.add_page()
    pdf.add_font("Hei", fname=FONT)
    wrap_text(pdf, md_path.stem, 16, 8)
    wrap_text(pdf, "可编辑源为同名 Markdown。模型源：02_docs/models。渲染图：02_docs/images。", 9, 5)
    pdf.ln(2)
    render_markdown(pdf, md_path.read_text(encoding="utf-8"))
    pdf.output(str(pdf_path))
    if pdf_path.stat().st_size < 800:
        raise RuntimeError(f"PDF too small: {pdf_path}")
    return pdf_path


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    leftover_html = OUT_DIR / "软件需求规格说明书.html"
    leftover_html.unlink(missing_ok=True)
    for path in DOCUMENTS:
        if not path.exists():
            print(f"missing {path}", file=sys.stderr)
            return 1
        pdf_path = to_pdf(path)
        print(f"{pdf_path.relative_to(ROOT)} ({pdf_path.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
