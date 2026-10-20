# Architecture Design — Validate the approve path

- Workflow: `ai-dev-c5b4d12e9be5`
- Repository (logical): `phase0-demo`
- Module: `approve`

## Requirement

Validate the approve path

## Decision

Implement approval validation using a state machine with Idempotency-Key for mutation endpoints, validated input through a dedicated validator, and secured with role-based access control

## Components

- ApprovalService
- ApprovalValidator
- IdempotencyService
- ApprovalStateTransitionHandler
- ApprovalController

## Constraints

- Database schema changes must use Liquibase changesets with backward compatibility
- All input parameters must be validated through the ApprovalValidator before processing
- Approval state transitions must follow the defined state machine to prevent invalid state changes
- Idempotency-Key header must be enforced for all mutating endpoints
- Role-based access control must restrict approval actions to authorized users only

## Knowledge applied

- `K-seed-spring-boot` Spring Boot services: engineering standard
- `K-seed-security-baseline` Security baseline for generated code
- `K-seed-api-design` REST API design baseline
- `K-seed-nextjs` Next.js frontends: engineering standard
- `ai-dev-95aecd4d2429` E2E approve path
- `ai-dev-b8fcc0c447cb` Phase 0 approve path
- `ai-dev-e9a446471e7f` E2E approve path

> Written by Kiến (Architect) of the AI Agent Team, backed by **qwen3:latest** (openai).