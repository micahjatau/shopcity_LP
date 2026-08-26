## ADDED Requirements

### Requirement: Canonical persistent Neo4j backend

The local Graphiti MCP service MUST use the repository-managed Neo4j service with persistent Docker volumes by default, and MUST use the configured database and memory group consistently.

#### Scenario: Fresh local startup

- **WHEN** a developer runs `npm run graphiti:mcp` with Docker available
- **THEN** the launcher starts or reuses the managed Neo4j service
- **AND** waits for Bolt connectivity before serving MCP requests
- **AND** reports an actionable error if Neo4j cannot become ready

#### Scenario: Neo4j container recreation

- **WHEN** the managed Neo4j container is recreated
- **THEN** previously written episodic memories remain available from the named data volume

### Requirement: Recoverable memory migration

The project MUST provide an idempotent migration from the former local FalkorDB graph into the canonical Neo4j memory group without modifying the source graph.

#### Scenario: Migrate existing bootstrap records

- **WHEN** the migration command reads the configured FalkorDB source graph
- **THEN** each source record is represented as a searchable Neo4j episodic memory in the canonical group
- **AND** source UUID and source metadata are retained
- **AND** the FalkorDB source remains unchanged

#### Scenario: Repeat migration

- **WHEN** the migration command is run more than once
- **THEN** it does not create duplicate Neo4j memories for the same source UUID

### Requirement: Health and recovery verification

The Graphiti health endpoint MUST verify the configured Neo4j database and expose the current episodic memory count.

#### Scenario: Healthy memory service

- **WHEN** Neo4j is reachable and the MCP service is running
- **THEN** `/health` returns a successful response with Neo4j connection details and episodic count

#### Scenario: Dependency outage

- **WHEN** Neo4j is unreachable during startup
- **THEN** the launcher exits nonzero with instructions to inspect the managed service logs or configure an external endpoint
