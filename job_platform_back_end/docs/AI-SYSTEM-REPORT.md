# TALENTO — AI Matching System: Full Technical Report

> **Stack:** Laravel 13 (PHP 8.3) · n8n (Docker) · Qdrant (Docker) · MySQL · Redis · Mistral AI (via OpenRouter) · Google Gemini · Google Drive

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [The Three AI Pipelines (n8n Lanes)](#2-the-three-ai-pipelines-n8n-lanes)
3. [What is Stored — MySQL vs Qdrant](#3-what-is-stored--mysql-vs-qdrant)
4. [MySQL Tables (AI-Related)](#4-mysql-tables-ai-related)
5. [Qdrant Collections](#5-qdrant-collections)
6. [All API Endpoints](#6-all-api-endpoints)
7. [Authentication & Security](#7-authentication--security)
8. [Score Thresholds & Match Logic](#8-score-thresholds--match-logic)
9. [Networking](#9-networking)
10. [Configuration (.env)](#10-configuration-env)
11. [End-to-End Data Flow Diagrams](#11-end-to-end-data-flow-diagrams)

---

## 1. Architecture Overview

Laravel never talks to Qdrant directly. All vector operations go through n8n.

```
                ┌──────────────────────────────────────────┐
                │              LARAVEL (host)               │
                │  Port 8000  —  bound to 0.0.0.0          │
                └──────────────┬───────────────────────────┘
                               │  HTTP (outbound to n8n)
                               ▼
                ┌──────────────────────────────────────────┐
                │              n8n  (Docker)                │
                │  Port 5678  —  localhost:5678             │
                │                                           │
                │  Lane A  CV Ingestion                     │
                │  Lane B  Job Published                    │
                │  Lane C  CV → Job Matching                │
                │  Lane E  Error Handler                    │
                └────────────┬──────────────┬──────────────┘
                             │              │
              HTTP (Qdrant)  │              │  HTTP (back to Laravel)
                             ▼              ▼
         ┌──────────────────────┐   ┌──────────────────────┐
         │  Qdrant  (Docker)    │   │  Laravel callbacks    │
         │  Port 6333           │   │  /api/n8n/*           │
         │                      │   │  /api/v1/resumes/*    │
         │  talento_cv_embed…   │   └──────────────────────┘
         │  talento_job_embed…  │
         └──────────────────────┘
```

**Key design rule:** Laravel stores only a `qdrant_point_id` string as a pointer.
The actual 1024-dimensional vectors live exclusively in Qdrant.

---

## 2. The Three AI Pipelines (n8n Lanes)

All three lanes live in a single n8n workflow file:
`docs/n8n/TALENTO-Unified-Pipeline.json`

---

### Lane A — CV Ingestion (triggered by Google Drive)

**Trigger:** A new PDF file is added to the Google Drive folder watched by n8n.

```
Google Drive (file added)
  │
  ├─► Download PDF  (Google Drive node)
  │      Uses the file ID as candidate_id
  │
  ├─► Mistral OCR  (OpenRouter API)
  │      Extracts raw text from the PDF
  │
  ├─► Gemini Classification  (models/gemini-2.0-flash)
  │      Splits text into 4 typed chunks:
  │        • skills
  │        • education
  │        • experience
  │        • additional_information
  │
  ├─► For each chunk (4 iterations):
  │    │
  │    ├─► POST /api/v1/resumes/chunks
  │    │      Stores chunk text in MySQL (resume_chunks)
  │    │
  │    ├─► Mistral Embed  (mistralai/mistral-embed-2312)
  │    │      Generates 1024-dim vector for this chunk
  │    │
  │    ├─► Qdrant Upsert  → talento_cv_embeddings
  │    │      Point payload: { candidate_id, chunk_type, char_count }
  │    │
  │    └─► POST /api/v1/resumes/embeddings
  │           Stores embedding metadata in MySQL (resume_embedding_meta)
  │
  └─► Auto-trigger Lane C
         Passes candidate_id to run matching immediately
```

**What Lane A produces:**
- 4 rows in `resume_chunks` (MySQL)
- 4 rows in `resume_embedding_meta` (MySQL)
- 4 vectors in Qdrant `talento_cv_embeddings` collection

---

### Lane B — Job Published (triggered by Laravel)

**Trigger:** A company publishes a job post (creates as published, or changes status draft → published).

```
Laravel Event: JobPostPublished
  │
  ├─► TriggerJobEmbeddingPipeline (Queued Listener)
  │      Creates job_embed_meta row (status = pending)
  │      POST http://localhost:5678/webhook/job-embed
  │      Header: X-N8N-Webhook-Secret: talento-secret-2026
  │      Body: {
  │        job_post_id, company_id, title,
  │        text_to_embed,   ← title + description + requirements + responsibilities
  │        employment_type, location, published_at,
  │        trigger: "job_publish",
  │        callback: {
  │          embedding_done: "http://host.docker.internal:8000/api/n8n/job-embedding/done",
  │          match_done:     "http://host.docker.internal:8000/api/n8n/match/done",
  │          log_error:      "http://host.docker.internal:8000/api/n8n/log-error"
  │        }
  │      }
  │
n8n Lane B receives webhook
  │
  ├─► Auth Gate (IF node)
  │      Checks X-N8N-Webhook-Secret == "talento-secret-2026"
  │      → wrong/missing: respond 401, stop
  │      → valid: continue
  │
  ├─► Mistral Embed  (mistralai/mistral-embed-2312)
  │      Embeds the full job text_to_embed  →  1024-dim vector
  │
  ├─► Qdrant Upsert  → talento_job_embeddings
  │      Point ID: UUIDv5 deterministic (based on job_post_id)
  │      Payload: { job_post_id, company_id, title, employment_type, location }
  │
  ├─► POST /api/n8n/job-embedding/done  (callback to Laravel)
  │      Header: X-N8N-Webhook-Secret: talento-secret-2026
  │      Body: { job_post_id, qdrant_point_id, model, dimensions, char_count }
  │      → Laravel updates job_embed_meta: status = "embedded"
  │
  ├─► Qdrant Search  → talento_cv_embeddings
  │      Query vector: the job's vector
  │      Top-K: up to 50 candidates
  │      Score threshold: 0.55
  │
  ├─► Aggregate matches
  │      Collect all results into one array
  │
  └─► POST /api/n8n/match/done  (callback to Laravel)
         Header: X-N8N-Webhook-Secret: talento-secret-2026
         Body: {
           job_post_id,
           trigger: "job_publish",
           matches: [
             { candidate_id: "<Google Drive file ID>", match_score: 0.87, score_breakdown: {...} },
             ...
           ]
         }
         → Laravel resolves Drive IDs → user IDs
         → Upserts job_candidate_matches rows
```

---

### Lane C — CV → Job Matching (shared, reachable from Lane A or webhook)

**Trigger:** Called automatically at the end of Lane A, or via `POST /webhook/cv-match`.

```
Entry (from Lane A or /cv-match webhook)
  │
  ├─► Auth Gate (IF node)  — only checked when entering via webhook
  │
  ├─► Fetch CV chunks from MySQL  (or use chunks already in memory from Lane A)
  │
  ├─► Weighted-average vector
  │      Combines the 4 chunk embeddings into one representative vector
  │      Weights: experience > skills > education > additional
  │
  ├─► Qdrant Search  → talento_job_embeddings
  │      Query vector: the candidate's averaged vector
  │      Top-K: up to 20 jobs
  │      Score threshold: 0.55
  │
  └─► POST /api/n8n/match/done  (callback to Laravel)
         Body: {
           job_post_id: <top matching job>,
           trigger: "cv_upload",
           matches: [ { candidate_id, match_score, score_breakdown } ]
         }
```

---

### Lane E — Error Handler (global)

**Trigger:** Any error in any node of the workflow.

```
n8n Error Trigger
  └─► POST /api/n8n/log-error
         Header: X-N8N-Webhook-Secret: talento-secret-2026
         Body: { workflow, node, error, job_post_id?, candidate_id? }
         → Laravel logs to n8n_error_logs (MySQL)
         → If job_post_id present: marks job_embed_meta.status = "failed"
```

---

## 3. What is Stored — MySQL vs Qdrant

| Data | Where | Why |
|------|-------|-----|
| Raw CV text (4 chunks) | **MySQL** `resume_chunks` | Full text, searchable, auditable |
| CV embedding metadata (model, dims, point ID) | **MySQL** `resume_embedding_meta` | Pointer to Qdrant point |
| CV vectors (1024 floats × 4 chunks) | **Qdrant** `talento_cv_embeddings` | Cosine similarity search |
| Job post embedding metadata | **MySQL** `job_embed_meta` | Status tracking, point ID |
| Job post vectors (1024 floats × 1 per job) | **Qdrant** `talento_job_embeddings` | Cosine similarity search |
| Match results (score, status) | **MySQL** `job_candidate_matches` | Business logic, recruiter actions |
| n8n workflow errors | **MySQL** `n8n_error_logs` | Debugging |
| Google Drive → user mapping | **MySQL** `users.google_drive_file_id` | Resolving Qdrant candidate_id → user |

**Rule of thumb:**
- Vectors → Qdrant (fast similarity search)
- Everything else → MySQL (business data, relations, recruiter actions)

---

## 4. MySQL Tables (AI-Related)

### `resume_chunks`

Stores the parsed text of each CV, split into 4 typed sections by Gemini.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `candidate_id` | varchar(191) | Google Drive file ID — same value used as Qdrant `candidate_id` |
| `chunk_type` | varchar(100) | `skills` \| `education` \| `experience` \| `additional_information` |
| `content` | text | Full text of this chunk (as classified by Gemini) |
| `char_count` | int | Length of content |
| `validated_at` | timestamp nullable | Set by n8n when chunk passes validation |
| `created_at`, `updated_at` | timestamps | Standard Laravel |

**Unique constraint:** `(candidate_id, chunk_type)` — re-running the pipeline overwrites, not duplicates.

---

### `resume_embedding_meta`

Tracks the embedding state of each CV chunk. One row per chunk per candidate.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `candidate_id` | varchar(191) | Google Drive file ID |
| `chunk_type` | varchar(100) | Which chunk this row tracks |
| `model` | varchar(255) | Embedding model used (e.g. `mistralai/mistral-embed-2312`) |
| `dimensions` | int | Vector size (1024) |
| `char_count` | int | Text length that was embedded |
| `qdrant_collection` | varchar(255) | `talento_cv_embeddings` |
| `qdrant_point_id` | varchar(255) nullable | The point ID in Qdrant |
| `embedded_at` | timestamp nullable | When embedding completed |
| `created_at`, `updated_at` | timestamps | Standard Laravel |

**Unique constraint:** `(candidate_id, chunk_type)`

---

### `job_embed_meta`

Tracks the embedding state of each job post. One row per job post.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `job_post_id` | bigint FK → `job_posts` (unique, cascade delete) | The job post |
| `model` | varchar | Embedding model used |
| `dimensions` | int | Vector size (1024) |
| `char_count` | int | Length of `text_to_embed` |
| `qdrant_collection` | varchar | `talento_job_embeddings` |
| `qdrant_point_id` | varchar nullable | The point ID in Qdrant (UUIDv5) |
| `status` | enum | `pending` \| `embedded` \| `failed` |
| `embedded_at` | timestamp nullable | When embedding completed |
| `created_at`, `updated_at` | timestamps | Standard Laravel |

**Status lifecycle:** `pending` → (n8n embeds) → `embedded` / `failed`

---

### `job_candidate_matches`

The matching results table — the core output of the AI pipeline.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `job_post_id` | bigint FK → `job_posts` (cascade delete) | Which job |
| `candidate_id` | bigint FK → `users` (cascade delete) | Which candidate (resolved from Drive ID) |
| `match_score` | decimal(5,4) | Cosine similarity score, range 0.0000 – 1.0000 |
| `score_breakdown` | JSON nullable | Breakdown per chunk type (from n8n) |
| `status` | enum | `new` \| `viewed` \| `shortlisted` \| `auto_shortlisted` \| `rejected` |
| `matched_by` | enum | `cv_upload` \| `job_publish` \| `scheduled_rerank` |
| `matched_at` | timestamp | When the match was computed |
| `notified_at` | timestamp nullable | When the candidate was notified |
| `created_at`, `updated_at` | timestamps | Standard Laravel |

**Unique constraint:** `(job_post_id, candidate_id)` — one match record per pair, upserted on re-runs.

**Indexes:** `match_score`, `status`, `matched_at`, `(job_post_id, match_score)`, `(candidate_id, match_score)`

---

### `n8n_error_logs`

Audit log of every workflow failure reported by Lane E.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Auto-increment |
| `workflow` | varchar nullable | n8n workflow name |
| `node` | varchar nullable | n8n node that failed |
| `error` | text nullable | Error message |
| `failed_at` | varchar nullable | Raw timestamp string from n8n |
| `created_at` | timestamp | When Laravel received the error |

---

### `users.google_drive_file_id` (column added to users table)

| Column | Type | Description |
|--------|------|-------------|
| `google_drive_file_id` | varchar(191) nullable unique | The Google Drive file ID of the candidate's CV — this is the bridge between Qdrant (`candidate_id`) and the internal `users` table |

When n8n sends match results, `candidate_id` is a Google Drive file ID. Laravel does:
```php
User::whereIn('google_drive_file_id', $driveIds)->pluck('id', 'google_drive_file_id')
```
to resolve it to an internal user ID before writing to `job_candidate_matches`.

---

## 5. Qdrant Collections

### `talento_cv_embeddings`

Stores one vector per CV chunk per candidate.

| Property | Value |
|----------|-------|
| Dimensions | 1024 |
| Distance | Cosine |
| Point ID | Deterministic UUIDv5 based on `candidate_id + chunk_type` |

**Payload stored with each point:**
```json
{
  "candidate_id": "<Google Drive file ID>",
  "chunk_type": "skills | education | experience | additional_information",
  "char_count": 450
}
```

**Typical size:** 4 points per candidate CV.

---

### `talento_job_embeddings`

Stores one vector per published job post.

| Property | Value |
|----------|-------|
| Dimensions | 1024 |
| Distance | Cosine |
| Point ID | Deterministic UUIDv5 based on `job_post_id` |

**Payload stored with each point:**
```json
{
  "job_post_id": 42,
  "company_id": 7,
  "title": "Senior Backend Developer",
  "employment_type": "full_time",
  "location": "Riyadh"
}
```

**Text that gets embedded** (built by `JobPost::embeddableText()`):
```
Senior Backend Developer

We are looking for a senior developer...

PHP
Laravel
MySQL
Redis

Build REST APIs
Write unit tests
Review pull requests
```

---

## 6. All API Endpoints

### n8n → Laravel Callbacks (secured by webhook secret)

Base: `/api/n8n/` — guarded by `X-N8N-Webhook-Secret` header, **no Sanctum token required**.

| Method | URL | Handler | Description |
|--------|-----|---------|-------------|
| `POST` | `/api/n8n/job-embedding/done` | `N8nCallbackController@jobEmbeddingDone` | n8n reports job vector upserted. Updates `job_embed_meta` status → `embedded`. |
| `POST` | `/api/n8n/match/done` | `N8nCallbackController@matchDone` | n8n reports match results. Upserts `job_candidate_matches`. |
| `POST` | `/api/n8n/log-error` | `N8nCallbackController@logError` | n8n reports a workflow error. Writes to `n8n_error_logs`. |

**Request body for `/api/n8n/job-embedding/done`:**
```json
{
  "job_post_id": 42,
  "qdrant_point_id": "550e8400-e29b-41d4-a716-446655440000",
  "model": "mistralai/mistral-embed-2312",
  "dimensions": 1024,
  "char_count": 1240
}
```

**Request body for `/api/n8n/match/done`:**
```json
{
  "job_post_id": 42,
  "trigger": "job_publish",
  "matches": [
    {
      "candidate_id": "1p_pNgtXCtnzBHsX_ouNr-UFO6_ohNJBG",
      "match_score": 0.87,
      "score_breakdown": { "skills": 0.91, "experience": 0.83 }
    }
  ]
}
```

**Request body for `/api/n8n/log-error`:**
```json
{
  "workflow": "TALENTO Unified",
  "node": "Qdrant Upsert",
  "error": "Connection refused",
  "job_post_id": 42
}
```

---

### n8n Pipeline Inbound Webhooks (Laravel → n8n)

These are n8n's webhook URLs that Laravel POSTs to.

| Method | URL | Triggered by | Description |
|--------|-----|--------------|-------------|
| `POST` | `http://localhost:5678/webhook/job-embed` | `TriggerJobEmbeddingPipeline` listener | Starts Lane B for a new/published job post |
| `POST` | `http://localhost:5678/webhook/cv-match` | Manual or Lane A | Starts Lane C for a specific candidate |

Both require header: `X-N8N-Webhook-Secret: talento-secret-2026`

---

### Laravel → n8n CV Pipeline (Sanctum bearer token required)

Base: `/api/v1/` — used by n8n to write back CV data into MySQL.

| Method | URL | Handler | Description |
|--------|-----|---------|-------------|
| `POST` | `/api/v1/resumes/chunks` | `ResumeChunkController@storeChunk` | Stores/updates a parsed CV chunk in `resume_chunks` |
| `POST` | `/api/v1/resumes/embeddings` | `ResumeChunkController@storeEmbedding` | Stores/updates embedding metadata in `resume_embedding_meta` |

**Request body for `/api/v1/resumes/chunks`:**
```json
{
  "candidate_id": "1p_pNgtXCtnzBHsX_ouNr-UFO6_ohNJBG",
  "chunk_type": "skills",
  "content": "PHP, Laravel, MySQL, Redis, REST APIs...",
  "char_count": 45,
  "validated_at": "2026-06-22T10:30:00Z"
}
```

**Request body for `/api/v1/resumes/embeddings`:**
```json
{
  "candidate_id": "1p_pNgtXCtnzBHsX_ouNr-UFO6_ohNJBG",
  "chunk_type": "skills",
  "model": "mistralai/mistral-embed-2312",
  "dimensions": 1024,
  "char_count": 45,
  "embedded_at": "2026-06-22T10:30:05Z",
  "qdrant_collection": "talento_cv_embeddings",
  "qdrant_point_id": "550e8400-e29b-41d4-a716-446655440001"
}
```

---

### Match Results — Company View (Sanctum + company_owner or company_member role)

| Method | URL | Handler | Description |
|--------|-----|---------|-------------|
| `GET` | `/api/jobs/{jobPost}/matches` | `MatchController@index` | List AI-matched candidates for a job post. Auto-marks `new` → `viewed`. |
| `PUT` | `/api/jobs/{jobPost}/matches/{match}` | `MatchController@updateStatus` | Recruiter manually sets status: `shortlisted`, `rejected`, `new` |

**Query params for `GET /api/jobs/{jobPost}/matches`:**
```
?min_score=0.60   ← minimum match score (default: 0.60)
?status=shortlisted
?per_page=20
```

**Response shape:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "job_post_id": 42,
      "candidate_id": 15,
      "match_score": "0.8700",
      "score_breakdown": { "skills": 0.91, "experience": 0.83 },
      "status": "auto_shortlisted",
      "matched_by": "job_publish",
      "matched_at": "2026-06-22T10:30:00.000000Z",
      "candidate": {
        "id": 15,
        "email": "test.candidate@talento.local",
        "google_drive_file_id": "1p_pNgtXCtnzBHsX_ouNr-UFO6_ohNJBG",
        "job_seeker": { "first_name": "Test", "last_name": "Candidate" }
      }
    }
  ],
  "meta": { "current_page": 1, "per_page": 20, "total": 3, "last_page": 1 }
}
```

---

### Match Results — Candidate View (Sanctum + job_seeker role)

| Method | URL | Handler | Description |
|--------|-----|---------|-------------|
| `GET` | `/api/candidate/matches` | `MatchController@candidateMatches` | Candidate's own matches — only score ≥ 0.60 shown |

---

## 7. Authentication & Security

### Inbound to n8n (from Laravel)
- Header: `X-N8N-Webhook-Secret: talento-secret-2026`
- Set in `.env`: `N8N_WEBHOOK_SECRET=talento-secret-2026`
- Sent by: `TriggerJobEmbeddingPipeline` listener

### Inbound to Laravel (from n8n callbacks)
- Same header: `X-N8N-Webhook-Secret: talento-secret-2026`
- Validated by: `ValidateN8nSecret` middleware (alias `n8n.secret`)
- Applied to all `/api/n8n/*` routes
- No Sanctum token on these routes — secret-only

### Inbound to Laravel (n8n writing CV data)
- Bearer token: Sanctum personal access token
- Applied to `/api/v1/resumes/*` routes
- n8n must have a valid Sanctum token in its HTTP node credentials

---

## 8. Score Thresholds & Match Logic

```
Match Score (Cosine Similarity)
│
├── ≥ 0.80  →  status: "auto_shortlisted"   (recruiter sees it at top, highlighted)
│
├── ≥ 0.60  →  status: "new"  (visible to recruiter, default filter)
│
└── < 0.60  →  status: "new"  (stored but HIDDEN from recruiter by default)
               (score_threshold in Qdrant search: 0.55 — so 0.55–0.60 range
                is stored but not surfaced unless min_score is manually lowered)
```

These constants are defined in `app/Models/JobCandidateMatch.php`:
```php
const SCORE_AUTO_SHORTLIST = 0.80;
const SCORE_SUGGEST        = 0.60;
```

---

## 9. Networking

| Direction | From | To | URL |
|-----------|------|----|-----|
| Laravel → n8n (job published) | Host port 8000 | Docker port 5678 | `http://localhost:5678/webhook/job-embed` |
| n8n → Laravel (callbacks) | Docker container | Host port 8000 | `http://host.docker.internal:8000/api/n8n/*` |
| n8n → Qdrant | Docker container | Docker container | `http://qdrant:6333` (bridge network) |
| n8n → OpenRouter (Mistral) | Docker | Internet | `https://openrouter.ai/api/v1/...` |
| n8n → Google Drive | Docker | Internet | Google Drive API |
| n8n → Gemini | Docker | Internet | `https://generativelanguage.googleapis.com` |

**Critical:** Laravel must be served on `0.0.0.0:8000` (not `127.0.0.1`) so n8n containers can reach it via `host.docker.internal`.
```bash
composer serve:lan
# → php artisan serve --host=0.0.0.0 --port=8000
```

---

## 10. Configuration (.env)

```env
# Laravel base URL — must be reachable by Docker containers
APP_URL=http://host.docker.internal:8000

# n8n webhook URLs (Laravel → n8n, outbound)
N8N_JOB_EMBED_WEBHOOK=http://localhost:5678/webhook/job-embed
N8N_CV_MATCH_WEBHOOK=http://localhost:5678/webhook/cv-match

# Shared secret for all n8n ↔ Laravel communication
N8N_WEBHOOK_SECRET=talento-secret-2026

# Queue must be running for the listener to fire
QUEUE_CONNECTION=sync   # or "database" + php artisan queue:work
```

Registered in `config/services.php`:
```php
'n8n' => [
    'job_embed_webhook' => env('N8N_JOB_EMBED_WEBHOOK'),
    'cv_match_webhook'  => env('N8N_CV_MATCH_WEBHOOK'),
    'webhook_secret'    => env('N8N_WEBHOOK_SECRET'),
],
```

---

## 11. End-to-End Data Flow Diagrams

### Flow 1: Company publishes a job post

```
Company dashboard
  │  POST /api/v1/company/job-posts  { status: "published" }
  ▼
Laravel CompanyService::createJobPost()
  │  JobPostPublished::dispatch($jobPost)
  ▼
TriggerJobEmbeddingPipeline (queued listener)
  │  INSERT job_embed_meta { status: "pending" }
  │  POST http://localhost:5678/webhook/job-embed
  │    { job_post_id, text_to_embed, callback URLs }
  ▼
n8n Lane B
  │  Mistral Embed  →  1024-dim vector
  │  Qdrant Upsert  →  talento_job_embeddings
  │  POST /api/n8n/job-embedding/done
  │    → MySQL: job_embed_meta.status = "embedded"
  │  Qdrant Search  →  talento_cv_embeddings (find matching CVs)
  │  POST /api/n8n/match/done
  │    → MySQL: UPSERT job_candidate_matches rows
  ▼
Result:
  • job_embed_meta.status = "embedded"
  • New rows in job_candidate_matches (scores 0.55–1.0)
  • Candidates with score ≥ 0.80 → auto_shortlisted
  • Recruiter can view at GET /api/jobs/{id}/matches
```

---

### Flow 2: Candidate uploads CV to Google Drive

```
Candidate uploads PDF to Google Drive folder
  ▼
n8n Lane A (Google Drive trigger)
  │  Download PDF
  │  Mistral OCR  →  raw text
  │  Gemini classify  →  4 chunks
  │
  │  For each chunk:
  │    POST /api/v1/resumes/chunks    → MySQL resume_chunks
  │    Mistral Embed  →  1024-dim vector
  │    Qdrant Upsert  →  talento_cv_embeddings
  │    POST /api/v1/resumes/embeddings  → MySQL resume_embedding_meta
  │
  └─► Auto-trigger Lane C
        Weighted-average of 4 chunk vectors
        Qdrant Search  →  talento_job_embeddings (find matching jobs)
        POST /api/n8n/match/done
          → MySQL: UPSERT job_candidate_matches rows
  ▼
Result:
  • 4 rows in resume_chunks
  • 4 rows in resume_embedding_meta
  • 4 vectors in talento_cv_embeddings
  • New rows in job_candidate_matches
  • Candidate can view at GET /api/candidate/matches (score ≥ 0.60)
```

---

### Flow 3: Recruiter manages matches

```
Recruiter opens candidate list for a job
  │  GET /api/jobs/{jobPost}/matches?min_score=0.60
  ▼
MatchController@index
  │  Reads job_candidate_matches
  │  Eager loads: candidate.email + job_seeker (first/last name)
  │  Auto-updates status: "new" → "viewed"
  ▼
Recruiter shortlists a candidate
  │  PUT /api/jobs/{jobPost}/matches/{match}  { "status": "shortlisted" }
  ▼
MatchController@updateStatus
  │  Updates job_candidate_matches.status = "shortlisted"
```

---

*Document generated from source: `app/`, `database/migrations/`, `routes/api.php`, `docs/n8n/README.md`*
*Last updated: 2026-06-22*
