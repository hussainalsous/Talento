# CV Embedding Pipeline — n8n & Qdrant Integration

**Project:** TALENTO Job Platform — Laravel Backend
**Author:** Backend Engineering
**Date:** 2026-06-20
**Status:** Implemented & tested (194 passing tests, 460 assertions)

---

## 1. Executive Summary

The backend now exposes a small, authenticated API surface that lets our **n8n**
AI workflow persist the results of CV (resume) processing. CV text is extracted,
chunked by section, and embedded with **Mistral AI** (1024-dimension vectors). The
vectors themselves live in **Qdrant** (the vector database); Laravel stores only the
**chunk text** and the **embedding metadata** — including a pointer back to the
Qdrant record so the frontend can run semantic search without the backend ever
holding the raw vectors.

Three endpoints were delivered, all idempotent and behind Sanctum authentication,
plus an error-reporting endpoint so failed n8n runs are captured both in the
application log and in the database.

---

## 2. Architecture Overview

```
        ┌──────────────┐      extract + chunk + embed (Mistral, 1024-d)
        │  Google Drive│─────────────────────────────────────────────┐
        │  (CV files)  │                                              │
        └──────────────┘                                              ▼
                                                            ┌──────────────────┐
                                                            │       n8n         │
                                                            │   AI Workflow     │
                                                            └─────────┬────────┘
                              upsert vector (1024-d)                   │  HTTP POST (Sanctum token)
                   ┌──────────────────────────────────────────────────┤
                   ▼                                                   ▼
            ┌─────────────┐                              ┌────────────────────────────┐
            │   Qdrant    │   point_id  ◀───stored as──▶ │   Laravel  (MySQL)          │
            │ talento_cv_ │                              │  • resume_chunks            │
            │ embeddings  │                              │  • resume_embedding_meta    │
            └─────────────┘                              │  • n8n_error_logs           │
                   ▲                                     └────────────────────────────┘
                   │   semantic search by point_id
            ┌─────────────┐
            │  Frontend   │
            └─────────────┘
```

**Key design principle — separation of concerns:**

| Data                         | Stored in | Reason                                              |
|------------------------------|-----------|-----------------------------------------------------|
| Raw 1024-d embedding vector  | Qdrant    | Purpose-built for vector similarity search          |
| Chunk text + metadata        | MySQL     | Relational queries, auditing, idempotent upserts    |
| `qdrant_point_id` pointer    | MySQL     | Links a metadata row to its vector for retrieval    |

The backend **never persists the raw vector** in MySQL. This is intentional and is
enforced by an automated test (see §6).

---

## 3. Data Model

### 3.1 `resume_chunks`
One row per CV section. Holds the text that was embedded.

| Column         | Type                | Notes                                             |
|----------------|---------------------|---------------------------------------------------|
| `id`           | bigint, PK          |                                                   |
| `candidate_id` | varchar(191), index | Google Drive file ID                              |
| `chunk_type`   | varchar(100)        | `skills` \| `education` \| `experience` \| `additional_information` |
| `content`      | text                | Raw chunk text                                    |
| `char_count`   | integer, default 0  |                                                   |
| `validated_at` | timestamp, nullable |                                                   |
| timestamps     |                     | `created_at`, `updated_at`                         |

**Unique constraint:** `(candidate_id, chunk_type)` — guarantees one chunk per
section per candidate and powers idempotent upserts.

### 3.2 `resume_embedding_meta`
One row per embedded chunk. Holds metadata about the embedding **and the Qdrant pointer** — but not the vector.

| Column              | Type                | Notes                                          |
|---------------------|---------------------|------------------------------------------------|
| `id`                | bigint, PK          |                                                |
| `candidate_id`      | varchar(191), index | Google Drive file ID                           |
| `chunk_type`        | varchar(100)        | Same enum as above                             |
| `model`             | varchar(255)        | e.g. `mistralai/mistral-embed-2312`            |
| `dimensions`        | integer             | e.g. `1024`                                    |
| `char_count`        | integer, default 0  |                                                |
| `qdrant_collection` | varchar(255)        | Default `talento_cv_embeddings`                |
| `qdrant_point_id`   | varchar(255), null  | ID of the vector record inside Qdrant          |
| `embedded_at`       | timestamp, nullable |                                                |
| timestamps          |                     | `created_at`, `updated_at`                      |

**Unique constraint:** `(candidate_id, chunk_type)` — idempotent upserts.

### 3.3 `n8n_error_logs`
Captures failures reported by the n8n workflow for later inspection.

| Column       | Type                | Notes                          |
|--------------|---------------------|--------------------------------|
| `id`         | bigint, PK          |                                |
| `workflow`   | varchar, nullable   | Workflow name                  |
| `node`       | varchar, nullable   | Node where the failure occurred|
| `error`      | text, nullable      | Error message                  |
| `failed_at`  | varchar, nullable   | Raw timestamp string from n8n  |
| `created_at` | timestamp, nullable | No `updated_at` (append-only)  |

---

## 4. API Endpoints

All routes are inside the `auth:sanctum` group, prefixed `api/v1`. n8n authenticates
with a Sanctum service token.

### 4.1 Store a CV chunk
```
POST /api/v1/resumes/chunks
```
**Body**

| Field          | Rules                                                                 |
|----------------|-----------------------------------------------------------------------|
| `candidate_id` | required, string, max 255                                             |
| `chunk_type`   | required, in: skills, education, experience, additional_information   |
| `content`      | required, string                                                      |
| `char_count`   | required, integer, min 1                                              |
| `validated_at` | nullable, string                                                     |

**Response 200**
```json
{ "ok": true, "message": "Chunk stored", "chunk_type": "skills" }
```

### 4.2 Store embedding metadata
```
POST /api/v1/resumes/embeddings
```
**Body**

| Field               | Rules                                                              |
|---------------------|-------------------------------------------------------------------|
| `candidate_id`      | required, string, max 255                                          |
| `chunk_type`        | required, in: skills, education, experience, additional_information|
| `model`             | required, string, max 255                                         |
| `dimensions`        | required, integer                                                |
| `char_count`        | required, integer, min 1                                          |
| `qdrant_collection` | nullable, string, max 255 (defaults to `talento_cv_embeddings`)  |
| `qdrant_point_id`   | nullable, string, max 255                                        |
| `embedded_at`       | nullable, string                                                 |

**Response 200**
```json
{
  "ok": true,
  "message": "Embedding metadata stored",
  "chunk_type": "experience",
  "qdrant_point_id": "a1b2c3d4-...",
  "qdrant_collection": "talento_cv_embeddings"
}
```
The response echoes the Qdrant pointer so the workflow (or frontend) can confirm
exactly where the vector landed.

### 4.3 Log an n8n error
```
POST /api/v1/n8n/log-error
```
**Body** — all fields nullable: `workflow`, `node`, `error`, `failed_at`.
The error is written to the `stack` log channel (level `error`, tag `n8n_error`)
**and** persisted to `n8n_error_logs`.

**Response 200**
```json
{ "ok": true }
```

---

## 5. Idempotency & Reliability

- **Idempotent upserts.** Both `storeChunk` and `storeEmbedding` use
  `updateOrCreate` keyed on `(candidate_id, chunk_type)`. Re-running the workflow
  (a common n8n retry pattern) **updates** the existing row instead of creating
  duplicates. This is verified by dedicated tests.
- **Defensive error handling.** Every controller method is wrapped in try/catch and
  returns a structured JSON error (`{ "ok": false, "error": ... }`, HTTP 500) on
  failure, with the exception logged server-side.
- **Authentication.** All three endpoints require a valid Sanctum token; an
  unauthenticated request returns 401 and writes nothing.
- **Eloquent throughout.** No raw SQL — mass-assignment is constrained by explicit
  `$fillable` arrays on every model.

---

## 6. The "no raw vector in the DB" guarantee

A specific test asserts that even if n8n includes a raw `embedding` array in its
payload, the backend **does not** create an `embedding` column or store the vector:

```php
test_store_embedding_does_not_store_vector_in_database()
```

It posts a payload containing a simulated 1024-element vector, confirms the request
succeeds, asserts the metadata row exists, and asserts the table has **no**
`embedding` column (`Schema::hasColumn(...) === false`). This locks in the
architectural boundary: vectors belong to Qdrant, metadata belongs to MySQL.

---

## 7. Helper for the frontend

`ResumeEmbeddingMeta::qdrantPointId(): ?string` returns the stored Qdrant point ID,
giving the frontend a clean accessor for building semantic-search queries against
the `talento_cv_embeddings` collection.

---

## 8. Testing

| Test suite                | Cases | Coverage                                                |
|---------------------------|-------|---------------------------------------------------------|
| `ResumeChunkTest`         | 5     | valid store, validation failures, idempotency, auth     |
| `ResumeEmbeddingTest`     | 4     | valid store, required-field validation, idempotency, no-vector guarantee |
| `N8nControllerTest`       | 2     | DB persistence, null-field tolerance                    |

**Full suite result:** `194 passed (460 assertions)` — no regressions introduced.

---

## 9. Issues Found & Resolved During Implementation

1. **MySQL key-length failure on `migrate:fresh`.**
   The composite unique index `(candidate_id varchar(255), chunk_type varchar(100))`
   exceeded MySQL's 1000-byte index limit on this connection (3-byte `utf8`:
   355 chars × 3 = 1065 bytes). It had previously only run against SQLite, which
   hid the problem.
   **Resolution:** `candidate_id` was reduced to `varchar(191)` in both tables. A
   Google Drive file ID is ~33–44 characters, so 191 is more than sufficient while
   keeping the composite index within limits.

2. **Self-contradicting assertion in the no-vector test.**
   The original test asserted both `assertDatabaseMissing(candidate_id)` and
   `assertDatabaseHas(candidate_id, chunk_type)` for the same row — logically
   impossible, since the metadata row is (correctly) stored.
   **Resolution:** Replaced the impossible `Missing` assertion with a
   `Schema::hasColumn('resume_embedding_meta', 'embedding') === false` check, which
   correctly expresses the intent ("the vector is not persisted") and passes.

---

## 10. Operational Notes

- **Qdrant** runs locally at `http://localhost:6333`; collection `talento_cv_embeddings`.
- **n8n** must send the `qdrant_point_id` it receives from Qdrant on each embedding
  upsert so the metadata row can reference it. If omitted, `qdrant_collection`
  still defaults to `talento_cv_embeddings` and `qdrant_point_id` is left null.
- **Service token:** confirm a dedicated Sanctum token exists for the n8n workflow.
  If not yet issued, a service user + token should be provisioned before go-live.

---

## 11. Files Touched

| File | Change |
|------|--------|
| `database/migrations/..._create_resume_chunks_table.php` | New table |
| `database/migrations/..._create_resume_embedding_meta_table.php` | New table + Qdrant columns |
| `database/migrations/..._create_n8n_error_logs_table.php` | New table |
| `app/Models/ResumeChunk.php` | New model |
| `app/Models/ResumeEmbeddingMeta.php` | New model + `qdrantPointId()` |
| `app/Models/N8nErrorLog.php` | New model |
| `app/Http/Requests/StoreResumeChunkRequest.php` | Validation |
| `app/Http/Requests/StoreResumeEmbeddingRequest.php` | Validation + Qdrant rules |
| `app/Http/Controllers/Api/V1/ResumeChunkController.php` | `storeChunk`, `storeEmbedding` |
| `app/Http/Controllers/Api/V1/N8nController.php` | `logError` |
| `routes/api.php` | 3 routes + imports |
| `tests/Feature/ResumeChunkTest.php` | 5 tests |
| `tests/Feature/ResumeEmbeddingTest.php` | 4 tests |
| `tests/Feature/N8nControllerTest.php` | 2 tests |
