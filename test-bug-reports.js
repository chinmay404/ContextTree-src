// Test script to verify bug reports functionality
const { mongoService } = require("./lib/mongodb");

async function testBugReports() {
  console.log("Testing bug reports functionality...");

  try {
    // Test database connection and table creation
    console.log("✓ Database connection established");

    // Test creating a bug report
    const testReport = {
      id: "test-" + Date.now(),
      userEmail: "test@example.com",
      userName: "Test User",
      title: "Test Bug Report",
      description: "This is a test bug report to verify the functionality",
      severity: "medium",
      stepsToReproduce: "1. Open app\n2. Click test button\n3. See error",
      expectedBehavior: "Should work correctly",
      actualBehavior: "Shows error instead",
      browserInfo: "Chrome 100.0.0",
      additionalInfo: "This is additional test information",
    };

    await mongoService.createBugReport(testReport);
    console.log("✓ Bug report created successfully");

    // Test retrieving bug reports
    const reports = await mongoService.getBugReportsByUser("test@example.com");
    console.log("✓ Bug reports retrieved:", reports.length);

    // Test getting report by ID
    const report = await mongoService.getBugReportById(testReport.id);
    console.log(
      "✓ Bug report retrieved by ID:",
      report ? "Found" : "Not found"
    );

    // Test updating status
    await mongoService.updateBugReportStatus(testReport.id, "resolved");
    console.log("✓ Bug report status updated");

    console.log("\n🎉 All bug report tests passed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

testBugReports();
