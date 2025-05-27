import type { DatabaseCollections } from "./collections"

export class DatabaseMigrations {
  private db: DatabaseCollections

  constructor(db: DatabaseCollections) {
    this.db = db
  }

  async runMigrations() {
    const migrations = [
      this.migration001_InitialSetup,
      this.migration002_AddVersioning,
      this.migration003_AddAnalytics,
      this.migration004_AddNotifications,
      this.migration005_AddBackupSystem,
    ]

    for (const migration of migrations) {
      try {
        await migration.call(this)
        console.log(`Migration ${migration.name} completed successfully`)
      } catch (error) {
        console.error(`Migration ${migration.name} failed:`, error)
        throw error
      }
    }
  }

  private async migration001_InitialSetup() {
    // Create initial collections and basic indexes
    await this.db.initializeDatabase()
  }

  private async migration002_AddVersioning() {
    // Add versioning fields to existing canvases and nodes
    await this.db.canvases.updateMany(
      { "versioning.currentVersion": { $exists: false } },
      {
        $set: {
          "versioning.currentVersion": 1,
          "versioning.versions": [
            {
              version: 1,
              createdAt: new Date(),
              createdBy: "$userId",
              description: "Initial version",
            },
          ],
        },
      },
    )

    await this.db.nodes.updateMany(
      { "versioning.version": { $exists: false } },
      {
        $set: {
          "versioning.version": 1,
          "versioning.history": [],
        },
      },
    )
  }

  private async migration003_AddAnalytics() {
    // Initialize analytics collection with aggregated data
    const users = await this.db.users.find({}).toArray()

    for (const user of users) {
      const canvasCount = await this.db.canvases.countDocuments({ userId: user.userId })
      const nodeCount = await this.db.nodes.countDocuments({ userId: user.userId })
      const messageCount = await this.db.messages.countDocuments({ userId: user.userId })

      await this.db.analytics.insertOne({
        userId: user.userId,
        period: {
          startDate: user.metadata.createdAt,
          endDate: new Date(),
          type: "monthly",
        },
        metrics: {
          canvasMetrics: {
            totalCanvases: canvasCount,
            activeCanvases: canvasCount,
            publicCanvases: 0,
            templatesCreated: 0,
          },
          nodeMetrics: {
            totalNodes: nodeCount,
            nodesByType: {},
            averageNodesPerCanvas: canvasCount > 0 ? nodeCount / canvasCount : 0,
          },
          chatMetrics: {
            totalMessages: messageCount,
            totalThreads: 0,
            averageMessagesPerThread: 0,
            aiInteractions: 0,
          },
          collaborationMetrics: {
            sharedCanvases: 0,
            collaborators: 0,
            commentsReceived: 0,
          },
          usageMetrics: {
            sessionCount: 0,
            totalTimeSpent: 0,
            averageSessionDuration: 0,
            featuresUsed: [],
          },
        },
        insights: {
          mostActiveCanvas: "",
          preferredNodeTypes: [],
          peakUsageHours: [],
          collaborationPatterns: {},
        },
        generatedAt: new Date(),
      } as any)
    }
  }

  private async migration004_AddNotifications() {
    // Set up notification preferences for existing users
    await this.db.users.updateMany(
      { "profile.preferences.notifications": { $exists: false } },
      {
        $set: {
          "profile.preferences.notifications": {
            email: true,
            push: true,
            mentions: true,
          },
        },
      },
    )
  }

  private async migration005_AddBackupSystem() {
    // Initialize backup settings for users
    await this.db.users.updateMany(
      { "subscription.features": { $exists: false } },
      {
        $set: {
          "subscription.features": ["basic_canvas", "chat_threads"],
        },
      },
    )
  }
}
