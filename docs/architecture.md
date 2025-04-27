# xOS Architecture

## 📚 Context
We're building **xOS** — an event-driven, AI-powered operating system for xLAB.

Architecture to keep in mind (for later phases):
- **/services/**
  • events-gateway   → Fastify server that ingests webhooks (Gmail, Zoho, Wio Bank…).  
  • quote-wizard     → Worker that turns briefs into Zoho quotes/invoices.  
  • payment-reconcile→ Worker that polls Wio transactions and marks Zoho invoices paid.  

- **/packages/**
  • shared-prompt    → Prompt templates & utility functions.  
  • vector-brain     → pgvector helper to store & query embeddings.  

- **/apps/**
  • dashboard-next   → Next.js + shadcn/ui HUD (Kanban, metrics, notifications).

Tech stack: **pnpm workspaces · TypeScript · Prisma · Postgres (+ pgvector) · Node 20 · Docker**.

## Directory Structure

