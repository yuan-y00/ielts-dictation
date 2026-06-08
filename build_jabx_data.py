#!/usr/bin/env python3
"""Build JabX interview practice data from the source Word document."""

from __future__ import annotations

import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / "materials" / "JabX_customer_interview_realistic_script.docx"
OUTPUT = ROOT / "data" / "jabx-interview.json"
TRANSLATIONS = ROOT / "data" / "jabx-translations.json"
NS = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
ROLE_RE = re.compile(r"^(Interviewer|Customer):\s*(.+)$")
SENTENCE_RE = re.compile(r".+?(?:[.!?][\"']?(?=\s+|$)|$)")
WORD_RE = re.compile(r"[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)?")
CHUNK_SIZE = 24
SHORT_SENTENCE_WORDS = 10


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


def split_sentences(text: str) -> list[str]:
    sentences = [match.group(0).strip() for match in SENTENCE_RE.finditer(text)]
    return [sentence for sentence in sentences if sentence]


def word_count(text: str) -> int:
    return len(WORD_RE.findall(text))


def merge_short_sentences(sentences: list[str]) -> list[str]:
    merged: list[str] = []
    i = 0
    while i < len(sentences):
        sentence = sentences[i]
        if word_count(sentence) <= SHORT_SENTENCE_WORDS and i + 1 < len(sentences):
            merged.append(f"{sentence} {sentences[i + 1]}".strip())
            i += 2
        elif word_count(sentence) <= SHORT_SENTENCE_WORDS and merged:
            merged[-1] = f"{merged[-1]} {sentence}".strip()
            i += 1
        else:
            merged.append(sentence)
            i += 1
    return merged


def load_translations() -> dict[str, str]:
    if not TRANSLATIONS.exists():
        return {}
    with TRANSLATIONS.open(encoding="utf-8") as f:
        return json.load(f)


def build_sentences(paragraphs: list[str], translations: dict[str, str]) -> list[dict[str, str]]:
    sentences: list[dict[str, str]] = []
    for paragraph in paragraphs:
        match = ROLE_RE.match(paragraph)
        if not match:
            continue
        role, english = match.groups()
        for sentence in merge_short_sentences(split_sentences(english)):
            sentences.append({
                "role": role,
                "english": sentence,
                "chinese": translations.get(sentence, ""),
            })
    return sentences


def chunk_sentences(sentences: list[dict[str, str]]) -> list[dict[str, object]]:
    essays: list[dict[str, object]] = []
    for start in range(0, len(sentences), CHUNK_SIZE):
        chunk = sentences[start:start + CHUNK_SIZE]
        part = len(essays) + 1
        essays.append({
            "id": f"jabx-{part:02d}",
            "title": f"Part {part}",
            "titleCn": "",
            "topic": f"JabX Customer Interview Role-play Script - Part {part}",
            "topicCn": "",
            "taskType": "dialogue",
            "wordCount": sum(len(item["english"].split()) for item in chunk),
            "sentences": chunk,
        })
    return essays


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Missing source document: {SOURCE}")

    paragraphs = read_docx_paragraphs(SOURCE)
    translations = load_translations()
    sentences = build_sentences(paragraphs, translations)
    if not sentences:
        raise ValueError("No Interviewer/Customer lines were found.")

    output = {
        "id": "jabx-interview",
        "icon": "JX",
        "title": "JabX Customer Interview Script",
        "description": "Realistic JabX customer interview role-play script for listening, shadowing, and dictation.",
        "essays": chunk_sentences(sentences),
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Done: {len(output['essays'])} parts, {len(sentences)} dialogue lines")


if __name__ == "__main__":
    main()
