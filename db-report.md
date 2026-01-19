# Database Architecture Report

## 1. Database System
**Current Database:** PostgreSQL  
**Driver:** `pg` (node-postgres)  
**Hosting/Provider:** Likely Supabase (indicated by SSL configuration and connection settings)

## 2. Key Code Locations

### Connection & Implementation
*   **[lib/mongodb.ts](lib/mongodb.ts)**: 
    *   **Description:** This is the primary database interaction file for application data. Despite its filename (which suggests a legacy MongoDB origin), it contains a **PostgreSQL implementation**.
    *   **Functionality:** It exports a service that persists application data (`canvases`, `nodes`, `edges`, `messages`, `bug_reports`) using raw SQL queries. It is designed as a drop-in replacement for a previous MongoDB service.
    *   **Key Code:** Initializes a `pg` Pool and creates tables if they don't exist.

*   **[lib/auth.ts](lib/auth.ts)**:
    *   **Description:** Handles authentication-related database operations.
    *   **Functionality:** Implements a custom **NextAuth adapter** using raw SQL. It manages the `users`, `accounts`, `sessions`, and `verification_tokens` tables.
    *   **Key Code:** Defines its own `pg` Pool optimized for connection lifecycles (e.g., Supabase connection pooler settings) and implements standard adapter methods (`createUser`, `getUser`, `createSession`, etc.).

### Data Models & Types
*   **[lib/storage.ts](lib/storage.ts)**:
    *   **Description:** Contains TypeScript interfaces describing the shape of the data.
    *   **Key Interfaces:**
        *   `CanvasData`: Structure of a canvas.
        *   `NodeData`: Structure of individual nodes within a canvas (including types like `entry`, `llmCall`, `userMessage`).
        *   `EdgeData`: Connections between nodes.
        *   `ChatMessage`: Messages within a node.

### Management Scripts
The `scripts/` directory contains several utilities for database management:
*   **[scripts/setup-production-db.js](scripts/setup-production-db.js)**: The main script for initializing the production database, creating tables in the correct order, and applying foreign key constraints.
*   **[scripts/clear-database.js](scripts/clear-database.js)**: Utility to wipe database content.
*   **[scripts/inspect-db.js](scripts/inspect-db.js)**: Utility to inspect the current state of tables.

## 3. Database Schema

The database uses a relational schema defined via raw SQL `CREATE TABLE` statements found in `lib/mongodb.ts` and `scripts/setup-production-db.js`. 

**Core Tables:**
*   `users`: User profiles (NextAuth integration).
*   `canvases`: Stores canvas metadata and references to users.
*   `nodes`: Individual nodes belonging to a canvas.
*   `edges`: Connections between nodes.
*   `messages`: Chat history associated with nodes.
*   `bug_reports`: User-submitted issue tracking.

**Auth Tables (NextAuth Standard):**
*   `accounts`: OAuth accounts linked to users.
*   `sessions`: User login sessions.
*   `verification_tokens`: For passwordless/email sign-in.

## 4. Implementation Details

*   **No ORM used:** The project relies entirely on raw SQL queries via the `pg` library.
*   **Migration Strategy:** There is no formal migration tool (like Prisma Migrate or Drizzle Kit). Schema updates rely on:
    *   `CREATE TABLE IF NOT EXISTS` statements in `lib/mongodb.ts` (runtime initialization).
    *   Specific scripts in `scripts/` for checking/updating constraints.
*   **Legacy Artifacts:** The filename `lib/mongodb.ts` is a misnomer; it contains Postgres logic but maintains the interface of a previous Mongo-based implementation to minimize code refactoring.
