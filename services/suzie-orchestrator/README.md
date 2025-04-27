# SUZIE Orchestrator Service

## Overview

The SUZIE Orchestrator is a service that automates follow-up activities for quotes in the xOS system. It identifies quotes that need follow-up based on specific criteria and creates actions for the SUZIE agent to execute.

## Features

- Automatically identifies quotes needing initial follow-up
- Handles secondary follow-ups for quotes already followed up on once
- Creates appropriate actions in the actions queue for the SUZIE agent
- Runs on a configurable schedule (default: daily at 06:00 UTC)
- Maintains follow-up counts and tracks when quotes were last updated

## Configuration

The service can be configured using environment variables:

- `QUOTE_FOLLOW_DAYS`: Number of days to wait before following up on a quote (default: 3)
- `QUOTE_MAX_FOLLOWUPS`: Maximum number of follow-ups per quote (default: 3)

## Follow-up Criteria

### Initial Follow-up

A quote is eligible for initial follow-up when:
- It has status='sent'
- It was sent at least `QUOTE_FOLLOW_DAYS` ago
- It has not been followed up on yet (followupCount = 0)

### Secondary Follow-up

A quote is eligible for secondary follow-up when:
- It has status='sent'
- It already had at least one follow-up (followupCount ≥ 1)
- Its last follow-up was at least `QUOTE_FOLLOW_DAYS` ago
- It has not reached the maximum number of follow-ups (followupCount < `QUOTE_MAX_FOLLOWUPS`)

## Action Types

The service creates two types of actions:

1. `send_quote_followup`: Initial follow-up for a quote
2. `send_quote_secondary_followup`: Secondary follow-up for a previously followed up quote

## Running the Service

The service starts automatically when the application is run. It:
1. Initializes a cron job to run the follow-up check at the scheduled time
2. Performs an initial check at startup

## Development

### Testing

Run tests with:

```
cd services/suzie-orchestrator
npx jest
```