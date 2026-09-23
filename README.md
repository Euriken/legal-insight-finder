# Nyay Khoj — AI-Powered Indian Legal Search Engine

Nyay Khoj (न्याय खोज, "Justice Search") is an AI agent that helps users navigate Indian law by combining hybrid legal search with conversational guidance on applicable IPC and BNS sections.

## Problem

Access to legal information in India is fragmented. Citizens often don't know which law applies to their situation, what section covers it, or how to find relevant precedent — and traditional legal search tools rely purely on keyword matching, missing context and intent.

## Solution

Nyay Khoj lets a user describe their legal situation in plain English. It retrieves the most relevant Supreme Court and High Court judgments using **hybrid search** (BM25 keyword search + dense vector similarity, fused via Reciprocal Rank Fusion), enriches results with IPC → BNS section mappings, and offers an **AI Legal Advisor** that explains relevant sections and next steps conversationally.

## Architecture

User query
   │
   ▼
Flask /search endpoint
   │
   ├── BM25 search (PostgreSQL ts_vector)
   ├── Vector search (pgvector, cosine similarity)
   │
   ▼
Reciprocal Rank Fusion (RRF)
   │
   ▼
IPC → BNS enrichment
   │
   ▼
Paginated results → React frontend
   │
   ▼
AI Legal Advisor (Groq LLaMA 3.1) — conversational follow-up

**Key concepts demonstrated:**
- Agent-style reasoning: hybrid retrieval + LLM-based conversational follow-up over a 22,000+ case legal corpus
- Deployability: live production deployment across two platforms
- Tool use: PostgreSQL + pgvector as a retrieval tool, Groq LLM as a reasoning/explanation tool

## Tech Stack

**Backend:** Flask, PostgreSQL + pgvector, BAAI/bge-base-en-v1.5 embeddings (768-dim), Groq API (LLaMA 3.1 8B Instant), gunicorn

**Frontend:** React + Vite, Tailwind CSS, shadcn/ui

**Database:** Neon (managed PostgreSQL), 22,904 Supreme Court judgments (1950–2024)

**Deployment:** Vercel (frontend), HuggingFace Spaces — Docker (backend)

## Live Demo

- Frontend: [legal-insight-finder.vercel.app](https://legal-insight-finder.vercel.app)
- Backend API: [euriken-nyay-khoj.hf.space](https://euriken-nyay-khoj.hf.space)

## Backend Repository

The backend API (Flask + PostgreSQL) is hosted in a separate repository. You can find its source code here: [github.com/Euriken/legal-backend](https://github.com/Euriken/legal-backend)

## Setup Instructions

### Backend
```bash
cd legal-backend
pip install -r requirements.txt
export DATABASE_URL="postgresql://..."
export GROQ_API_KEY="..."
python app.py
```

### Frontend
```bash
cd legal-insight-finder
npm install
npm run dev
```

## Features

- Hybrid BM25 + vector search with RRF fusion
- AI Legal Advisor chatbot (Groq LLaMA 3.1) for IPC/BNS section explanations
- IPC → BNS section mapping with sentence range estimation
- Paginated search results (5 per page, up to 10 pages)
- Case detail pages with full judgment text
- Stats/analytics dashboard (court tier breakdown, case type distribution)
- In-memory caching for search and stats endpoints

## Dataset

22,904 Supreme Court of India judgments sourced from [OpenNyAI InJudgements](https://github.com/OpenNyAI/Opennyai) and [OpenNyaya (Kaggle)](https://www.kaggle.com/datasets/gaurav41/opennyaya-supreme-court-clean), spanning 1950–2024.

## Security Note

API keys and database credentials are managed via environment variables / secrets on HuggingFace Spaces, never committed to the repository.

---


