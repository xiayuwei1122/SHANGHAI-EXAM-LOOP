#!/usr/bin/env python3
"""Build Mini Program paper modules from publicly accessible recall pages.

The generated data keeps source attribution and an explicit unofficial flag.
It is intended for the owner's private development build. Review content
licensing before publishing the question text in a public Mini Program.
"""

from __future__ import annotations

import hashlib
import json
import pathlib
import re
import subprocess
import sys
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag


ROOT = pathlib.Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "miniprogram" / "data"
PACKAGES_DIR = ROOT / "miniprogram" / "packages"
BASE = "https://kaoweilai.cn"

def paper_spec(
    paper_id: str,
    exam_type: str,
    year: int,
    category: str,
    title: str,
    path: str,
    min_questions: int,
) -> dict:
    return {
        "id": paper_id,
        "exam_type": exam_type,
        "year": year,
        "category": category,
        "title": title,
        "display_title": re.sub(r"^\d{4}\s*", "", title),
        "path": path,
        "min_questions": min_questions,
    }


# New exam families use a different exam_type. Add their display name in
# miniprogram/data/exam-types.js; the home-page filter needs no further changes.
PAPERS = [
    paper_spec("sh-2019-a", "city-exam", 2019, "A", "2019 上海市考行测 A 类", "/zhenti-sh-2019-a.html", 115),
    paper_spec("sh-2019-b", "city-exam", 2019, "B", "2019 上海市考行测 B 类", "/zhenti-sh-2019-b.html", 115),
    paper_spec("sh-2020-a", "city-exam", 2020, "A", "2020 上海市考行测 A 类", "/zhenti-sh-2020-a.html", 115),
    paper_spec("sh-2020-b", "city-exam", 2020, "B", "2020 上海市考行测 B 类", "/zhenti-sh-2020-b.html", 115),
    paper_spec("sh-2021-a", "city-exam", 2021, "A", "2021 上海市考行测 A 类", "/zhenti-sh-2021-a.html", 115),
    paper_spec("sh-2021-b", "city-exam", 2021, "B", "2021 上海市考行测 B 类", "/zhenti-sh-2021-b.html", 115),
    paper_spec("sh-2022-b", "city-exam", 2022, "B", "2022 上海市考行测 B 类", "/zhenti-sh-2022-b.html", 115),
    paper_spec("sh-2023-a", "city-exam", 2023, "A", "2023 上海市考行测 A 类", "/zhenti-sh-2023-a.html", 115),
    paper_spec("sh-2025-a", "city-exam", 2025, "A", "2025 上海市考行测 A 类", "/zhenti-sh-2025-a.html", 115),
    paper_spec("sh-2025-b", "city-exam", 2025, "B", "2025 上海市考行测 B 类", "/zhenti-sh-2025-b.html", 115),
]


def curl_text(url: str) -> str:
    return subprocess.check_output(
        ["curl", "-L", "--fail", "--silent", "--show-error", url],
        text=True,
    )


def clean_text(node: Tag | None) -> str:
    if not node:
        return ""
    return re.sub(r"[ \t\u3000]+", " ", node.get_text("\n", strip=True)).strip()


def module_name(section: Tag) -> str:
    heading = section.find("h2")
    if not heading:
        return "未分类"
    clone = BeautifulSoup(str(heading), "html.parser")
    small = clone.find("small")
    if small:
        small.decompose()
    return clean_text(clone)


def asset_name(url: str) -> str:
    path = urlparse(url).path
    suffix = pathlib.Path(path).suffix or ".img"
    stem = pathlib.Path(path).stem or "asset"
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:8]
    return f"{re.sub(r'[^a-zA-Z0-9_-]+', '-', stem)}-{digest}{suffix}"


def download_image(url: str, paper_id: str) -> str:
    full_url = urljoin(BASE, url)
    folder = PACKAGES_DIR / paper_id / "assets"
    folder.mkdir(parents=True, exist_ok=True)
    name = asset_name(full_url)
    target = folder / name
    if not target.exists():
        subprocess.run(
            ["curl", "-L", "--fail", "--silent", "--show-error", "-o", str(target), full_url],
            check=True,
        )
    return f"/packages/{paper_id}/assets/{name}"


def images_in(node: Tag | None, paper_id: str) -> list[str]:
    if not node:
        return []
    result = []
    for image in node.find_all("img"):
        source = image.get("src") or image.get("data-src")
        if source:
            result.append(download_image(source, paper_id))
    return result


def direct_stem(qb: Tag) -> str:
    paragraphs = []
    for child in qb.children:
        if not isinstance(child, Tag):
            continue
        if child.name == "p":
            paragraphs.append(clean_text(child))
        elif child.name in {"ol", "details"}:
            break
    return "\n".join(filter(None, paragraphs))


def answer_and_explanation(qb: Tag) -> tuple[str, str, bool]:
    answer_box = qb.select_one(".ans")
    if not answer_box:
        return "", "暂无参考解析。", False
    disputed = "dispute" in (answer_box.get("class") or []) or "存在争议" in clean_text(answer_box)
    bold = answer_box.find("b")
    match = re.search(r"参考答案[：:]\s*([A-D]+)", clean_text(bold)) if bold else None
    answer = "".join(sorted(set(match.group(1)))) if match and not disputed else ""
    why = answer_box.select_one(".why")
    explanation = clean_text(why) or clean_text(answer_box)
    return answer, explanation or "暂无参考解析。", disputed


def parse_paper(
    paper_id: str,
    exam_type: str,
    year: int,
    category: str,
    title: str,
    display_title: str,
    path: str,
) -> dict:
    source_url = urljoin(BASE, path)
    soup = BeautifulSoup(curl_text(source_url), "html.parser")
    questions = []
    modules = []
    materials = {}
    material_counter = 0

    for module_index, section in enumerate(soup.select("main section"), 1):
        name = module_name(section)
        module_id = f"m{module_index}"
        question_ids = []
        current_material_id = ""

        for child in section.children:
            if not isinstance(child, Tag):
                continue
            classes = child.get("class") or []
            if "mat" in classes:
                material_counter += 1
                current_material_id = f"mat{material_counter}"
                materials[current_material_id] = {
                    "text": clean_text(child),
                    "images": images_in(child, paper_id),
                }
                continue
            if "q" not in classes:
                continue

            number_match = re.search(r"(\d+)$", child.get("id", ""))
            if not number_match:
                continue
            number = int(number_match.group(1))
            qb = child.select_one(".qb") or child
            options = []
            for item in qb.select("ol.opts > li"):
                key_node = item.find("span")
                key = clean_text(key_node)
                value_node = item.find("div")
                options.append({
                    "key": key,
                    "text": clean_text(value_node),
                    "images": images_in(value_node, paper_id),
                })

            # Some graph/diagram questions render all four choices in one image.
            if not options:
                options = [{"key": key, "text": "", "images": []} for key in "ABCD"]

            question_images = []
            for image in qb.find_all("img"):
                if image.find_parent("li") or image.find_parent("details"):
                    continue
                source = image.get("src") or image.get("data-src")
                if source:
                    question_images.append(download_image(source, paper_id))

            answer, explanation, disputed = answer_and_explanation(qb)
            multi = len(answer) > 1 or name == "综合分析能力" or number >= 116
            questions.append({
                "id": f"q{number}",
                "number": number,
                "moduleId": module_id,
                "moduleName": name,
                "type": child.get("data-t") or "未分类",
                "materialId": current_material_id,
                "stem": direct_stem(qb),
                "images": question_images,
                "options": options,
                "answer": answer,
                "explanation": explanation,
                "disputed": disputed,
                "multi": multi,
            })
            question_ids.append(f"q{number}")

        modules.append({
            "id": module_id,
            "name": name,
            "questionIds": question_ids,
            "questionCount": len(question_ids),
        })

    questions.sort(key=lambda item: item["number"])
    return {
        "id": paper_id,
        "examType": exam_type,
        "year": year,
        "category": category,
        "title": title,
        "displayTitle": display_title,
        "sourceUrl": source_url,
        "unofficial": True,
        "notice": "考生回忆版，非招录主管部门官方发布；参考答案与解析仅供训练复盘。",
        "questionCount": len(questions),
        "answerCount": sum(bool(q["answer"]) for q in questions),
        "modules": modules,
        "materials": materials,
        "questions": questions,
    }


def js_module(value: object) -> str:
    return "// Generated by scripts/import_papers.py\nmodule.exports = " + json.dumps(
        value, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"


def update_subpackages() -> None:
    app_config_path = ROOT / "miniprogram" / "app.json"
    app_config = json.loads(app_config_path.read_text(encoding="utf-8"))
    app_config["subpackages"] = [
        {
            "root": f"packages/{spec['id']}",
            "pages": ["exam/exam", "result/result"],
        }
        for spec in PAPERS
    ]
    app_config_path.write_text(
        json.dumps(app_config, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> int:
    PACKAGES_DIR.mkdir(parents=True, exist_ok=True)
    catalog = []
    total_questions = 0
    total_answers = 0

    for spec in PAPERS:
        paper_id = spec["id"]
        paper = parse_paper(
            paper_id=paper_id,
            exam_type=spec["exam_type"],
            year=spec["year"],
            category=spec["category"],
            title=spec["title"],
            display_title=spec["display_title"],
            path=spec["path"],
        )
        if paper["questionCount"] < spec["min_questions"]:
            raise RuntimeError(
                f"{paper_id}: only {paper['questionCount']} questions parsed; "
                f"expected at least {spec['min_questions']}"
            )
        package_dir = PACKAGES_DIR / paper_id
        package_dir.mkdir(parents=True, exist_ok=True)
        target = package_dir / "paper.js"
        target.write_text(js_module(paper), encoding="utf-8")
        catalog.append({key: paper[key] for key in (
            "id", "examType", "year", "category", "title", "displayTitle",
            "sourceUrl", "unofficial", "notice", "questionCount", "answerCount", "modules"
        )})
        for page_name, component_name in (("exam", "exam-runner"), ("result", "result-review")):
            page_dir = package_dir / page_name
            page_dir.mkdir(parents=True, exist_ok=True)
            page_dir.joinpath(f"{page_name}.js").write_text(
                "const paper = require('../paper')\n"
                "Page({\n"
                "  onLoad(options) { this.options = options },\n"
                f"  onReady() {{ this.selectComponent('#{component_name}').init(paper, this.options || {{}}) }},\n"
                f"  onHide() {{ const component = this.selectComponent('#{component_name}'); if (component && component.handleHide) component.handleHide() }}\n"
                "})\n",
                encoding="utf-8",
            )
            page_dir.joinpath(f"{page_name}.json").write_text(
                json.dumps(
                    {
                        "navigationBarTitleText": "正在答题" if page_name == "exam" else "本轮复盘",
                        "usingComponents": {
                            component_name: f"/components/{component_name}/{component_name}"
                        },
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                ),
                encoding="utf-8",
            )
            page_dir.joinpath(f"{page_name}.wxml").write_text(
                f'<{component_name} id="{component_name}" />\n', encoding="utf-8"
            )
            page_dir.joinpath(f"{page_name}.wxss").write_text("page { min-height: 100%; }\n", encoding="utf-8")
        total_questions += paper["questionCount"]
        total_answers += paper["answerCount"]
        print(f"{paper_id}: {paper['questionCount']} questions, {paper['answerCount']} answers", file=sys.stderr)

    index_source = (
        "// Generated by scripts/import_papers.py\n"
        f"const catalog = {json.dumps(catalog, ensure_ascii=False, separators=(',', ':'))};\n"
        "module.exports = { catalog };\n"
    )
    (DATA_DIR / "index.js").write_text(index_source, encoding="utf-8")
    update_subpackages()
    expected_min_questions = sum(spec["min_questions"] for spec in PAPERS)
    if len(catalog) != len(PAPERS) or total_questions < expected_min_questions or total_answers == 0:
        raise RuntimeError(f"unexpected totals: {len(catalog)} papers, {total_questions} questions, {total_answers} answers")
    print(f"OK: {len(catalog)} papers, {total_questions} questions, {total_answers} reference answers")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
