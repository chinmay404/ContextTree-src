# External Context & RAG Integration Specification

## 1. Database Schema Extensions

We have extended the PostgreSQL schema to support external file storage and RAG (Retrieval-Augmented Generation) capabilities.

### Table: `external_files`
Stores metadata and raw content of files uploaded by users.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `id` | `text` | PK | UUID of the file entry |
| `user_email` | `text` | | Owner's email (FK -> users) |
| `node_id` | `text` | | Linked Node ID on canvas (FK -> nodes) |
| `canvas_id` | `text` | | Linked Canvas ID (FK -> canvases) |
| `file_name` | `text` | | Original filename |
| `file_type` | `text` | | MIME type (e.g., application/pdf) |
| `file_size` | `integer` | | Size in bytes |
| `content` | `text` | | Extracted text content |
| `processed` | `boolean` | `false` | Status flag |
| `created_at` | `timestamptz` | `now()` | |
| `updated_at` | `timestamptz` | `now()` | |

### Table: `context_chunks` (Prepared for RAG)
Stores vector embeddings for chunks of text from the external files.
*Note: This table is created but currently populating it depends on the External API's response or a background job.*

| Column | Type | Description |
|--------|------|-------------|
| `id` | `text` | PK |
| `file_id` | `text` | FK -> external_files |
| `content` | `text` | The specific text chunk |
| `embedding` | `vector(1536)` | PGVector embedding (OpenAI compatible) |
| `chunk_index` | `integer` | Ordering |
| `token_count` | `integer` | |

---

## 2. Next.js API Endpoint: `/api/upload`

This endpoint acts as a **Middleware/Proxy** between the Client (React Flow Canvas) and the Heavy-Lifting External Logic Service.

### Request Specification
*   **URL:** `/api/upload`
*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`
*   **Authentication:** Session Cookie (NextAuth)

**Form Fields:**
1.  `file`: The binary file (PDF, DOCX, TXT).
2.  `nodeId`: The UUID of the node created on the canvas.
3.  `canvasId`: The UUID of the current canvas.

### Logic Flow
1.  **Auth Check:** Verifies user session.
2.  **Environment Check:** Ensures `LLM_API_URL` is set.
3.  **URL Construction:** Derives the processing endpoint from `LLM_API_URL` (e.g., converts `.../v1/chat` to `.../process-doc`).
4.  **Forwarding:** Streams the file + metadata to the External Service.
5.  **Database Transaction:**
    *   Upon success from External Service, creates the **Node** in the `nodes` table.
    *   Creates the **File Record** in the `external_files` table.
6.  **Response:** Returns the extracted content to the client for UI display.

---

## 3. External Processing Service Contract

The Next.js backend expects your Python/External server to implement the following endpoint to handle the heavy lifting (parsing, chunking, embedding).

### Endpoint Definition
*   **Expected Path:** `/process-doc` (relative to your base `LLM_API_URL`)
*   **Method:** `POST`
*   **Content-Type:** `multipart/form-data`

### Expected Input (from Next.js)
The External Service will receive the exact same FormData passed from Next.js, plus the user's email.
*   `file`: The file object.
*   `nodeId`: String.
*   `canvasId`: String.
*   `userEmail`: String.

### Expected Output (JSON)
The External Service must return a JSON object.

```json
{
  "content": "The full extracted text content of the document...",
  "chunks": [ ... ], // Optional: If you want to return chunks immediately
  "status": "success"
}
```

### Responsibilities of External Service
1.  **File Parsing:** Use `PyPDF2`, `unstructured`, or `textract` to get text.
2.  **Chunking:** Split text into semantic chunks.
3.  **Embedding (Optional Now / Future):** Generate embeddings for chunks.
4.  **Vector DB (Future):** Insert embeddings into the Postgres or separate Vector DB.
    *   *Note: Currently, the Next.js app inserts the `external_files` record. If the External Service calculates embeddings, it should ideally write to the database directly OR return them to Next.js to write.*
