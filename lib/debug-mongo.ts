"use server"

// Debug utility to help identify MongoDB URI issues
export async function debugMongoUri(uri: string): Promise<void> {
  try {
    const url = new URL(uri)
    const params = new URLSearchParams(url.search)

    console.log("=== MongoDB URI Debug Info ===")
    console.log("Protocol:", url.protocol)
    console.log("Host:", url.host)
    console.log("Database:", url.pathname.slice(1))

    // Check for duplicate parameters
    const paramCounts = new Map<string, number>()
    const allParamNames = []

    for (const [key] of params) {
      allParamNames.push(key)
      paramCounts.set(key, (paramCounts.get(key) || 0) + 1)
    }

    console.log("All parameters found:", allParamNames)

    // Report duplicates
    const duplicates = Array.from(paramCounts.entries()).filter(([, count]) => count > 1)
    if (duplicates.length > 0) {
      console.warn("DUPLICATE PARAMETERS FOUND:")
      duplicates.forEach(([param, count]) => {
        console.warn(`  ${param}: appears ${count} times`)
        console.warn(`  Values: ${params.getAll(param).join(", ")}`)
      })
    } else {
      console.log("No duplicate parameters found")
    }

    console.log("=== End Debug Info ===")
  } catch (error) {
    console.error("Failed to debug MongoDB URI:", error)
  }
}
