# MongoDB Serialization for Next.js Server Components

## Problem

Next.js has a restriction where MongoDB objects cannot be passed directly from Server Components to Client Components due to non-serializable properties like `ObjectId` and MongoDB's internal methods like `toJSON()`.

This leads to errors like:

\`\`\`
Error: Only plain objects can be passed to Client Components from Server Components. Objects with toJSON methods are not supported.
\`\`\`

## Solution

This workspace implements a comprehensive solution for handling MongoDB serialization in Next.js applications, ensuring that server components can safely pass data to client components.

### Key Components

#### 1. Serialization Utilities (`lib/serialize-mongodb.ts`)

- `serializeMongoDoc`: Recursively serializes MongoDB documents, converting ObjectId to strings and Date objects to ISO strings
- `serializeCollection`: Serializes arrays of MongoDB documents
- `serializeCursorResults`: Handles MongoDB cursors from `find()` operations and array results
- `safeSerializeForClient`: Ensures data is fully serialized with a JSON round-trip as a final validation
- `cleanForNextJs`: Alias for safeSerializeForClient, used specifically when data will be passed to client components
- `withMongoSerialization`: Higher-order function to automatically wrap server actions with serialization
- `isMongoDocument`: Helper to detect if an object is a MongoDB document

#### 2. Server Action Middleware (`lib/server-action-middleware.ts`)

A reusable middleware function that can wrap any server action to automatically handle serialization and error handling:

\`\`\`typescript
export const myServerAction = withSerializedResponse(async function (
  arg1,
  arg2
) {
  // Your server action implementation
  return { success: true, data: mongoDbResult };
});
\`\`\`

### Best Practices

1. **Never return raw MongoDB documents** directly from server actions

   - Always use `serializeMongoDoc` or `safeSerializeForClient` on results

2. **Handle MongoDB objects with special properties**:

   - `ObjectId`: Convert to string using `.toString()`
   - `Date`: Convert to ISO string using `.toISOString()`

3. **Use the middleware approach for consistency**:

   - Either use `withSerializedResponse` from server-action-middleware.ts
   - Or use `withMongoSerialization` from serialize-mongodb.ts

4. **Watch out for duplicate functions**:

   - We fixed a bug where `serializeCursorResults` was duplicated
   - Always ensure utilities have unique names to avoid TypeScript errors
   - `Buffer`: Convert to hex or base64 string

5. **For deeply nested objects**:

   - Use `safeSerializeForClient` to recursively handle all MongoDB-specific types

6. **When working with MongoDB cursors**:

   - Use `serializeCursorResults` to handle pagination and cursor conversion

7. **Final Safety Check**:
   - Apply a `JSON.parse(JSON.stringify(...))` round trip as a final validation when needed

### Implementation Examples

#### Server Action Example

\`\`\`typescript
"use server";
import { safeSerializeForClient } from "@/lib/serialize-mongodb";

export async function getDocumentById(id: string) {
  const database = await db();
  const doc = await database.collection("documents").findOne({ _id: id });
  return safeSerializeForClient(doc);
}
\`\`\`

#### Full Pattern with Error Handling

\`\`\`typescript
"use server";
import { withSerializedResponse } from "@/lib/server-action-middleware";

export const getUserData = withSerializedResponse(async function (
  userId: string
) {
  const database = await db();
  const userData = await database.collection("users").findOne({ userId });

  if (!userData) {
    throw new Error("User not found");
  }

  return {
    success: true,
    user: userData,
  };
});
\`\`\`

### Troubleshooting

If you still encounter serialization errors:

1. Verify that all server actions are using the serialization utilities
2. Check for deeply nested MongoDB objects that might be missed
3. Look for custom classes or objects with non-standard prototypes
4. Consider using `withSerializedResponse` middleware for all server actions
