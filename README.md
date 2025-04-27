
# xOS – Phase 0 quick-start

Event-driven microservices system built with TypeScript and Fastify.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev             # boots events-gateway on port 5000

# Check health
curl http://0.0.0.0:5000/health    # → { "status": "ok" }
```
