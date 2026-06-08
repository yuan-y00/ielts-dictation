#!/usr/bin/env python3
"""Build IELTS key sentence practice data from the source Word document."""

from __future__ import annotations

import json
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "materials" / "IELTS_听写重点句子_纯句子版.docx"
OUTPUT = ROOT / "data" / "ielts-key-sentences.json"
TRANSLATIONS = ROOT / "data" / "ielts-key-sentences-translations.json"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
CHUNK_SIZE = 24


def read_docx_paragraphs(path: Path) -> list[str]:
    with zipfile.ZipFile(path) as docx:
        xml = docx.read("word/document.xml")

    root = ET.fromstring(xml)
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", NS):
        text = "".join(node.text or "" for node in para.findall(".//w:t", NS)).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def load_translations() -> dict[str, str]:
    if not TRANSLATIONS.exists():
        return {}
    with TRANSLATIONS.open(encoding="utf-8") as f:
        return json.load(f)


def chunk_sentences(sentences: list[str], translations: dict[str, str]) -> list[dict[str, object]]:
    lessons: list[dict[str, object]] = []
    for start in range(0, len(sentences), CHUNK_SIZE):
        chunk = sentences[start:start + CHUNK_SIZE]
        part = len(lessons) + 1
        lessons.append({
            "id": f"ielts-key-{part:02d}",
            "title": f"Part {part}",
            "titleCn": "",
            "topic": f"IELTS Key Dictation Sentences - Part {part}",
            "topicCn": "",
            "taskType": "sentences",
            "wordCount": sum(len(sentence.split()) for sentence in chunk),
            "sentences": [
                {"english": sentence, "chinese": translations.get(sentence, "")}
                for sentence in chunk
            ],
        })
    return lessons


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source document: {SOURCE}")

    sentences = read_docx_paragraphs(SOURCE)
    if not sentences:
        raise ValueError("No sentences were found.")

    translations = load_translations()
    output = {
        "id": "ielts-key-sentences",
        "icon": "IELTS",
        "title": "IELTS 听写重点句子",
        "description": "Pure English IELTS key sentences for dictation practice.",
        "essays": chunk_sentences(sentences, translations),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Done: {len(output['essays'])} parts, {len(sentences)} sentences")


if __name__ == "__main__":
    main()
