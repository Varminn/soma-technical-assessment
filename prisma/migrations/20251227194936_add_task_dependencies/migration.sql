-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromTaskId" INTEGER NOT NULL,
    "toTaskId" INTEGER NOT NULL,
    "dependencyType" TEXT NOT NULL DEFAULT 'FS',
    CONSTRAINT "TaskDependency_fromTaskId_fkey" FOREIGN KEY ("fromTaskId") REFERENCES "Todo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_toTaskId_fkey" FOREIGN KEY ("toTaskId") REFERENCES "Todo" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Todo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME,
    "imageUrl" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 1,
    "earliestStart" DATETIME,
    "isOnCriticalPath" BOOLEAN NOT NULL DEFAULT false
);
INSERT INTO "new_Todo" ("createdAt", "dueDate", "id", "imageUrl", "title") SELECT "createdAt", "dueDate", "id", "imageUrl", "title" FROM "Todo";
DROP TABLE "Todo";
ALTER TABLE "new_Todo" RENAME TO "Todo";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_fromTaskId_toTaskId_key" ON "TaskDependency"("fromTaskId", "toTaskId");
