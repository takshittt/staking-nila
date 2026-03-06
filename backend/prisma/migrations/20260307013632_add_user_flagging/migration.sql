-- Add flagging fields to User model
-- This migration adds support for flagging users to prevent wallet connections

-- Note: MongoDB migrations are handled by Prisma automatically
-- This file serves as documentation for the schema changes

-- Fields added:
-- isFlagged: Boolean (default: false)
-- flaggedAt: DateTime (nullable)
-- flaggedReason: String (nullable)
-- flaggedBy: String (nullable) - Admin ID who flagged the user
-- unflaggedAt: DateTime (nullable)
