#!/usr/bin/env python3
"""Fill the IELTS key sentence translation cache, then rebuild the practice JSON."""

from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from urllib.error import URLError
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "ielts-key-sentences.json"
TRANSLATIONS = ROOT / "data" / "ielts-key-sentences-translations.json"
GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"


def load_json(path: Path, fallback):
    if not path.exists():
        return fallback
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def iter_english_lines(data: dict) -> list[str]:
    lines: list[str] = []
    for essay in data["essays"]:
        for sentence in essay["sentences"]:
            english = sentence["english"]
            if english not in lines:
                lines.append(english)
    return lines


def translate_once(text: str) -> str:
    params = urllib.parse.urlencode({
        "client": "gtx",
        "sl": "en",
        "tl": "zh-CN",
        "dt": "t",
        "q": text,
    })
    request = urllib.request.Request(
        f"{GOOGLE_TRANSLATE_URL}?{params}",
        headers={"User-Agent": "Mozilla/5.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        payload = json.loads(response.read().decode("utf-8"))
    return "".join(part[0] for part in payload[0]).strip()


def translate(text: str) -> str:
    last_error: Exception | None = None
    for attempt in range(1, 5):
        try:
            return translate_once(text)
        except (TimeoutError, URLError, socket.timeout) as error:
            last_error = error
            time.sleep(attempt * 1.5)
    raise RuntimeError(f"Translation failed after retries: {text}") from last_error


def polish_translation(english: str, chinese: str) -> str:
    replacements = {
        "互联网": "网络",
        "远程办公": "远程工作",
        "电信工作": "远程工作",
        "心": "心脏",
        "甜蜜点": "最佳平衡点",
        "聊天": "闲聊",
        "闲聊也": "闲聊也",
        "数字划分": "数字鸿沟",
        "数字鸿沟": "数字鸿沟",
        "在线": "上网",
        "离线儿童": "无法上网的儿童",
    }
    polished = chinese
    for source, target in replacements.items():
        polished = polished.replace(source, target)

    if "small talk" in english.lower():
        polished = polished.replace("小谈话", "闲聊").replace("闲谈", "闲聊")
    if "teleworking" in english.lower() or "teleworkers" in english.lower():
        polished = polished.replace("远程办公", "远程工作")
    if "digital divide" in english.lower():
        polished = polished.replace("数字划分", "数字鸿沟")
    return polished


def main() -> None:
    data = load_json(DATA, None)
    if not data:
        subprocess.run([sys.executable, "build_ielts_sentences_data.py"], cwd=ROOT, check=True)
        data = load_json(DATA, None)

    translations: dict[str, str] = load_json(TRANSLATIONS, {})
    lines = iter_english_lines(data)
    missing = [line for line in lines if not translations.get(line)]
    print(f"Translation cache: {len(translations)} existing, {len(missing)} missing")

    for index, line in enumerate(missing, 1):
        translations[line] = polish_translation(line, translate(line))
        if index % 10 == 0 or index == len(missing):
            with TRANSLATIONS.open("w", encoding="utf-8") as f:
                json.dump(translations, f, ensure_ascii=False, indent=2)
                f.write("\n")
            print(f"Translated {index}/{len(missing)}")
        time.sleep(0.15)

    translations = {
        english: polish_translation(english, chinese)
        for english, chinese in translations.items()
    }

    with TRANSLATIONS.open("w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)
        f.write("\n")

    subprocess.run([sys.executable, "build_ielts_sentences_data.py"], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
