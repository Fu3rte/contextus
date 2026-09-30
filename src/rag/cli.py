import argparse
import json

from . import config, db, pipeline


def main(argv=None):
    parser = argparse.ArgumentParser(prog="rag", description="最基础的 RAG 知识文档问答")
    sub = parser.add_subparsers(dest="command", required=True)

    ingest = sub.add_parser("ingest", help="入库文件或目录")
    ingest.add_argument("path")

    for name, help_text in (("search", "只检索片段"), ("query", "检索并生成答案")):
        cmd = sub.add_parser(name, help=help_text)
        cmd.add_argument("question")
        cmd.add_argument("--top-k", type=int, default=config.TOP_K)

    serve = sub.add_parser("serve", help="启动 FastAPI 服务")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)

    args = parser.parse_args(argv)

    if args.command == "serve":
        import uvicorn

        from .api import app

        uvicorn.run(app, host=args.host, port=args.port)
        return

    with db.connect() as conn:
        db.init_schema(conn)

        if args.command == "ingest":
            for source, chunks in pipeline.ingest_path(conn, args.path):
                print(f"已入库 {source}: {chunks} 块")
        elif args.command == "search":
            for hit in pipeline.search(conn, args.question, args.top_k):
                # 整块打印。之前只显示前 120 字符，答案可能在块的后半段被藏掉
                print(f"{hit['score']:.4f}  {hit['source']}#{hit['chunk_index']}  ({len(hit['content'])} 字符)")
                print("  " + hit["content"].replace("\n", "\n  "))
                print()
        else:
            result = pipeline.answer(conn, args.question, args.top_k)
            print(result["answer"])
            print("\n依据：")
            for i, hit in enumerate(result["sources"], 1):
                print(json.dumps(
                    {"n": i, "source": hit["source"], "score": round(hit["score"], 4)},
                    ensure_ascii=False,
                ))


if __name__ == "__main__":
    main()
