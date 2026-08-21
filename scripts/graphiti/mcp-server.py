#!/usr/bin/env python3
from __future__ import annotations

import asyncio
import os
import uuid
from datetime import datetime, timezone
from typing import Any

from neo4j import GraphDatabase
from mcp.server.mcpserver import MCPServer
from starlette.requests import Request
from starlette.responses import JSONResponse, PlainTextResponse, Response

HOST = os.environ.get('GRAPHITI_MCP_HOST', '127.0.0.1')
PORT = int(os.environ.get('GRAPHITI_MCP_PORT', '8000'))
MCP_PATH = os.environ.get('GRAPHITI_MCP_PATH', '/mcp')
NEO4J_URI = os.environ.get('GRAPHITI_NEO4J_URI', 'bolt://127.0.0.1:7687')
NEO4J_USER = os.environ.get('GRAPHITI_NEO4J_USER', 'neo4j')
NEO4J_PASSWORD = os.environ.get('GRAPHITI_NEO4J_PASSWORD', 'demodemo')
NEO4J_DATABASE = os.environ.get('GRAPHITI_NEO4J_DATABASE', 'neo4j')
DEFAULT_GROUP_ID = os.environ.get('GRAPHITI_GROUP_ID', 'shopcity_LP')


def _driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))


def _serialize_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _serialize_value(inner) for key, inner in value.items()}
    if isinstance(value, list):
        return [_serialize_value(item) for item in value]
    if hasattr(value, 'isoformat'):
        try:
            return value.isoformat()
        except TypeError:
            pass
    return value


def _normalize_record(record: dict[str, Any]) -> dict[str, Any]:
    return {key: _serialize_value(value) for key, value in record.items()}


def _create_memory(
    *,
    name: str,
    episode_body: str,
    source_description: str,
    group_id: str,
    source: str,
    reference_time: datetime,
) -> dict[str, Any]:
    node_uuid = str(uuid.uuid4())
    content = episode_body.strip() or name.strip()
    created_at = reference_time.astimezone(timezone.utc)

    with _driver() as driver:
        with driver.session(database=NEO4J_DATABASE) as session:
            session.run(
                '''
                CREATE (e:Episodic {
                  uuid: $uuid,
                  name: $name,
                  group_id: $group_id,
                  source: $source,
                  source_description: $source_description,
                  content: $content,
                  created_at: datetime($created_at),
                  valid_at: datetime($valid_at),
                  entity_edges: []
                })
                ''',
                uuid=node_uuid,
                name=name,
                group_id=group_id,
                source=source,
                source_description=source_description,
                content=content,
                created_at=created_at.isoformat(),
                valid_at=reference_time.astimezone(timezone.utc).isoformat(),
            )

    return {
        'ok': True,
        'uuid': node_uuid,
        'group_id': group_id,
        'name': name,
        'source': source,
        'created_at': created_at.isoformat(),
    }


def _search_memory(query: str, group_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
    normalized_query = query.strip().lower()
    if not normalized_query:
        return []

    cypher = '''
        MATCH (e:Episodic)
        WHERE ($group_id IS NULL OR e.group_id = $group_id)
          AND (
            toLower(coalesce(e.name, '')) CONTAINS $query
            OR toLower(coalesce(e.content, '')) CONTAINS $query
            OR toLower(coalesce(e.source_description, '')) CONTAINS $query
          )
        RETURN
          e.uuid AS uuid,
          e.name AS name,
          e.group_id AS group_id,
          e.source AS source,
          e.source_description AS source_description,
          e.content AS content,
          e.created_at AS created_at,
          e.valid_at AS valid_at
        ORDER BY e.created_at DESC
        LIMIT $limit
    '''

    with _driver() as driver:
        with driver.session(database=NEO4J_DATABASE) as session:
            rows = session.run(
                cypher,
                parameters={
                    'query': normalized_query,
                    'group_id': group_id,
                    'limit': max(1, min(limit, 50)),
                },
            ).data()

    return [_normalize_record(row) for row in rows]


def _search_memory_facts(query: str, group_id: str | None = None, limit: int = 10) -> list[dict[str, Any]]:
    results = _search_memory(query=query, group_id=group_id, limit=limit)
    return [
        {
            'subject': item.get('name') or item.get('uuid'),
            'predicate': 'memory contains',
            'object': (item.get('content') or '')[:240],
            'uuid': item.get('uuid'),
            'group_id': item.get('group_id'),
            'source': item.get('source'),
        }
        for item in results
    ]


def _get_status() -> dict[str, Any]:
    with _driver() as driver:
        with driver.session(database=NEO4J_DATABASE) as session:
            node_count = session.run(
                'MATCH (e:Episodic) RETURN count(e) AS count',
            ).single()[0]
            has_focus_memory = session.run(
                '''
                MATCH (e:Episodic {group_id: $group_id})
                WHERE e.name CONTAINS $needle OR e.content CONTAINS $needle
                RETURN count(e) AS count
                ''',
                group_id=DEFAULT_GROUP_ID,
                needle='Role-aware sidebar routing cleanup',
            ).single()[0]

    return {
        'ok': True,
        'neo4j': {
            'uri': NEO4J_URI,
            'database': NEO4J_DATABASE,
            'episodicCount': node_count,
            'hasRecentCleanupMemory': has_focus_memory > 0,
        },
        'mcp': {
            'host': HOST,
            'port': PORT,
            'path': MCP_PATH,
        },
    }


server = MCPServer(
    name='graphiti-memory',
    title='Graphiti Memory',
    description='Local Graphiti-compatible memory server for engineering sessions.',
    version='0.1.0',
)


@server.tool(name='add_memory', description='Add an episodic memory to local Neo4j storage.')
async def add_memory(
    name: str,
    episode_body: str,
    source_description: str,
    group_id: str = DEFAULT_GROUP_ID,
    source: str = 'text',
    reference_time: str | None = None,
) -> dict[str, Any]:
    parsed_reference_time = (
        datetime.fromisoformat(reference_time)
        if reference_time
        else datetime.now(timezone.utc)
    )
    return await asyncio.to_thread(
        _create_memory,
        name=name,
        episode_body=episode_body,
        source_description=source_description,
        group_id=group_id,
        source=source,
        reference_time=parsed_reference_time,
    )


@server.tool(name='search_nodes', description='Search local episodic memory nodes.')
async def search_nodes(
    query: str,
    group_id: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    return {
        'ok': True,
        'results': await asyncio.to_thread(
            _search_memory,
            query=query,
            group_id=group_id,
            limit=limit,
        ),
    }


@server.tool(name='search_memory_facts', description='Search local episodic memory as fact triples.')
async def search_memory_facts(
    query: str,
    group_id: str | None = None,
    limit: int = 10,
) -> dict[str, Any]:
    return {
        'ok': True,
        'facts': await asyncio.to_thread(
            _search_memory_facts,
            query=query,
            group_id=group_id,
            limit=limit,
        ),
    }


@server.tool(name='get_status', description='Check Neo4j and Graphiti MCP health.')
async def get_status() -> dict[str, Any]:
    return await asyncio.to_thread(_get_status)


@server.custom_route('/health', methods=['GET'])
async def health(_request: Request) -> Response:
    return JSONResponse(await asyncio.to_thread(_get_status))


@server.custom_route('/', methods=['GET'])
async def root(_request: Request) -> Response:
    return PlainTextResponse('Graphiti MCP server is running.')


async def main() -> None:
    await server.run_streamable_http_async(
        host=HOST,
        port=PORT,
        streamable_http_path=MCP_PATH,
        json_response=True,
        stateless_http=True,
    )


if __name__ == '__main__':
    asyncio.run(main())
