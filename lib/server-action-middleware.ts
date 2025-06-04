"use server";

import { safeSerializeForClient } from "@/lib/serialize-mongodb";

/**
 * Middleware for server actions that handles MongoDB object serialization
 * and provides error handling.
 * 
 * @param handler The server action handler function
 * @returns A wrapped server action that safely handles MongoDB objects
 */
export function withSerializedResponse<TArgs extends any[], TReturn>(
  handler: (...args: TArgs) => Promise<TReturn>
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      // Execute the original handler
      const result = await handler(...args);
      
      // Apply safe serialization to the response
      return safeSerializeForClient(result);
    } catch (error) {
      console.error(`Server action error:`, error);
      
      // Return a serialized error response
      // Cast is necessary because we're changing the error structure
      return safeSerializeForClient({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }) as unknown as TReturn;
    }
  };
}

/**
 * Example usage:
 * 
 * ```ts
 * export const myServerAction = withSerializedResponse(async function(arg1, arg2) {
 *   // Your server action implementation
 *   return { success: true, data: mongoDbResult };
 * });
 * ```
 */
