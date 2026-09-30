import argparse
import json
from pathlib import Path

from rag.composition import build_application

TEXT_SUFFIXES = {".md", ".txt", ".markdown"}


def read_documents(path):
    """展开文件或目录（递归 .md/.txt），产出 (source, 正文) 列表。"""
    root = Path(path)
    if root.is_dir():
        files = sorted(p for p in root.rglob("*") if p.suffix.lower() in TEXT_SUFFIXES)
        return [
            (file.relative_to(root).as_posix(), file.read_text(encoding="utf-8"))
            for file in files
        ]
    return [(root.name, root.read_text(encoding="utf-8"))]


def main(argv=None):
    parser = argparse.ArgumentParser(prog="rag", description="最基础的 RAG 知识文档问答")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest = sub.add_parser("ingest", help="入库文件或目录")
    ingest.add_argument("path")

    for name, help_text in (("search", "只检索片段"), ("query", "检索并生成答案")):
        cmd = sub.add_parser(name, help=help_text)
        cmd.add_argument("question")
        cmd.add_argument("--top-k", type=int, default=None)

    serve = sub.add_parser("serve", help="启动 FastAPI 服务")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    args = parser.parse_args(argv)

    if args.command == "serve":
        import uvicorn

        from rag.interfaces.api import app

        uvicorn.run(app, host=args.host, port=args.port)
        return

    rag = build_application()
    rag.store.init_schema()

    if args.command == "ingest":
        for source, text in read_documents(args.path):
            print(f"已入库 {source}: {rag.ingest.run(source, text)} 块")
    elif args.command == "search":
        for hit in rag.search.run(args.question, args.top_k):
            # 整块打印。之前只显示前 120 字符，答案可能在块的后半段被藏掉
            print(f"{hit.score:.4f}  {hit.source}#{hit.chunk_index}  ({len(hit.content)} 字符)")
            print("  " + hit.content.replace("\n", "\n  "))
            print()
    else:
        answer, sources = rag.answer.run(args.question, args.top_k)
        print(answer)
        print("\n依据：")
        for i, hit in enumerate(sources, 1):
            print(json.dumps(
                {"n": i, "source": hit.source, "score": round(hit.score, 4)},
                ensure_ascii=False,
            ))


if __name__ == "__main__":
    main()
