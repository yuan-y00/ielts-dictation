#!/usr/bin/env python3
"""Fill the JabX translation cache, then rebuild the practice JSON."""

from __future__ import annotations

import json
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "jabx-interview.json"
TRANSLATIONS = ROOT / "data" / "jabx-translations.json"
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


def translate(text: str) -> str:
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


def polish_translation(english: str, chinese: str) -> str:
    replacements = {
        "太极拳": "空击",
        "太极": "空击",
        "跆拳道": "踢拳",
        "手套训练": "拳靶训练",
        "艰苦的陪练": "高强度实战对练",
        "陪练": "实战对练",
        "十字架": "后手直拳",
        "硬十字": "有力的后手直拳",
        "十字": "后手直拳",
        "交叉后": "后手直拳后",
        "钩子": "勾拳",
        "表格太宽松": "动作太松散",
        "形式太宽松": "动作太松散",
        "出拳功率": "出拳力量",
        "沉重的包": "沙袋",
        "重袋": "重沙袋",
        "双端袋": "双头球",
        "双端球": "双头球",
        "空战演习": "空中格斗练习",
        "空战": "空中格斗",
        "心肺功能": "心肺能力",
        "更多的家庭有氧运动产品": "更偏家庭有氧训练的产品",
        "持续表现并流汗": "持续出现并流汗",
        "打斗": "格斗",
    }
    polished = chinese
    for source, target in replacements.items():
        polished = polished.replace(source, target)

    if "shadowboxing" in english:
        polished = polished.replace("空击拳", "空击")
    if "kickboxing" in english:
        polished = polished.replace("踢拳课程", "踢拳课")
    if "form" in english and "表格" in polished:
        polished = polished.replace("表格", "动作")
    return polished


def main() -> None:
    data = load_json(DATA, None)
    if not data:
        subprocess.run([sys.executable, "build_jabx_data.py"], cwd=ROOT, check=True)
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

    subprocess.run([sys.executable, "build_jabx_data.py"], cwd=ROOT, check=True)


if __name__ == "__main__":
    main()
