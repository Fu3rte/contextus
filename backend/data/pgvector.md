# pgvector 简介

pgvector 是 PostgreSQL 的向量扩展，给数据库加上 vector 类型和向量索引。
装了它之后，文档内容和向量可以放在同一张表里，不必再额外维护一个向量数据库。

# 常用运算符

- `<->` 欧氏距离
- `<#>` 负内积
- `<=>` 余弦距离

# 检索写法

SELECT content, 1 - (embedding <=> %s::vector) AS score
FROM chunks
ORDER BY embedding <=> %s::vector
LIMIT 5;

数据量小的时候这样全表扫描就够了；数据量大了再建 HNSW 索引：

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
