#!/usr/bin/env python3
"""Copy recoverable local FalkorDB memory records into canonical Neo4j."""
from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from typing import Any

import redis
from neo4j import GraphDatabase


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--falkordb-url', default=os.environ.get('GRAPHITI_FALKORDB_URL', 'redis://127.0.0.1:6380/0'))
    parser.add_argument('--graph', default=os.environ.get('GRAPHITI_FALKORDB_GRAPH', 'default_db'))
    parser.add_argument('--group-id', default=os.environ.get('GRAPHITI_GROUP_ID', 'shopcity_LP'))
    parser.add_argument('--neo4j-uri', default=os.environ.get('GRAPHITI_NEO4J_URI', 'bolt://127.0.0.1:7687'))
    parser.add_argument('--neo4j-user', default=os.environ.get('GRAPHITI_NEO4J_USER', 'neo4j'))
    parser.add_argument('--neo4j-password', default=os.environ.get('GRAPHITI_NEO4J_PASSWORD', 'shopcity-graphiti'))
    parser.add_argument('--neo4j-database', default=os.environ.get('GRAPHITI_NEO4J_DATABASE', 'neo4j'))
    return parser.parse_args()


def _source_rows(client: redis.Redis, graph: str) -> list[dict[str, Any]]:
    result = client.execute_command(
        'GRAPH.QUERY',
        graph,
        'MATCH (n) RETURN n.uuid, n.name, n.group_id, n.summary, n.created_at, labels(n)',
    )
    if not result or len(result) < 2:
        return []
    headers, rows = result[0], result[1]
    return [dict(zip(headers, row)) for row in rows]


def _content(row: dict[str, Any]) -> str:
    summary = str(row.get('n.summary') or '').strip()
    name = str(row.get('n.name') or '').strip()
    labels = str(row.get('labels(n)') or '').strip()
    return f'{summary}\n\nSource labels: {labels}'.strip() or name


def migrate(args: argparse.Namespace) -> int:
    source = redis.from_url(args.falkordb_url, decode_responses=True)
    rows = _source_rows(source, args.graph)
    if not rows:
        print(f'No records found in FalkorDB graph {args.graph!r}.')
        return 0

    now = datetime.now(timezone.utc).isoformat()
    with GraphDatabase.driver(args.neo4j_uri, auth=(args.neo4j_user, args.neo4j_password)) as driver:
        driver.verify_connectivity()
        with driver.session(database=args.neo4j_database) as session:
            for row in rows:
                source_uuid = str(row.get('n.uuid') or '')
                if not source_uuid:
                    continue
                created_at = str(row.get('n.created_at') or now)
                session.run(
                    '''
                    MERGE (e:Episodic {source: 'falkordb', source_uuid: $source_uuid})
                    SET e.uuid = coalesce(e.uuid, $uuid),
                        e.name = $name,
                        e.group_id = $group_id,
                        e.source_description = $source_description,
                        e.content = $content,
                        e.created_at = datetime($created_at),
                        e.valid_at = datetime($created_at),
                        e.entity_edges = []
                    ''',
                    source_uuid=source_uuid,
                    uuid=f'falkordb:{source_uuid}',
                    name=str(row.get('n.name') or source_uuid),
                    group_id=args.group_id,
                    source_description=f'Migrated from FalkorDB graph {args.graph}; original group {row.get("n.group_id") or "unknown"}.',
                    content=_content(row),
                    created_at=created_at,
                ).consume()
    print(f'Migrated {len(rows)} records from FalkorDB graph {args.graph!r} into Neo4j group {args.group_id!r}.')
    return len(rows)


if __name__ == '__main__':
    raise SystemExit(0 if migrate(_parse_args()) >= 0 else 1)
