-- CreateTable
CREATE TABLE "Series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "license" TEXT
);

-- CreateTable
CREATE TABLE "Season" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seriesId" INTEGER NOT NULL,
    "seasonName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "fixedSetup" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Season_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Track" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "config" TEXT
);

-- CreateTable
CREATE TABLE "Car" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "RaceWeek" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "seasonId" INTEGER NOT NULL,
    "weekNum" INTEGER NOT NULL,
    "trackId" INTEGER NOT NULL,
    "simulatedStartTime" DATETIME,
    CONSTRAINT "RaceWeek_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RaceWeek_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LapPoint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceWeekId" INTEGER NOT NULL,
    "carId" INTEGER,
    "subsessionId" INTEGER NOT NULL,
    "custId" INTEGER NOT NULL,
    "lapType" TEXT NOT NULL,
    "irating" INTEGER NOT NULL,
    "lapTimeMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LapPoint_raceWeekId_fkey" FOREIGN KEY ("raceWeekId") REFERENCES "RaceWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LapPoint_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IngestRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "raceWeekId" INTEGER NOT NULL,
    "runAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subsessionsProcessed" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    CONSTRAINT "IngestRun_raceWeekId_fkey" FOREIGN KEY ("raceWeekId") REFERENCES "RaceWeek" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Series_category_idx" ON "Series"("category");

-- CreateIndex
CREATE INDEX "Season_seriesId_idx" ON "Season"("seriesId");

-- CreateIndex
CREATE INDEX "RaceWeek_trackId_idx" ON "RaceWeek"("trackId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceWeek_seasonId_weekNum_key" ON "RaceWeek"("seasonId", "weekNum");

-- CreateIndex
CREATE INDEX "LapPoint_raceWeekId_lapType_idx" ON "LapPoint"("raceWeekId", "lapType");

-- CreateIndex
CREATE UNIQUE INDEX "LapPoint_subsessionId_custId_lapType_carId_key" ON "LapPoint"("subsessionId", "custId", "lapType", "carId");

-- CreateIndex
CREATE INDEX "IngestRun_raceWeekId_idx" ON "IngestRun"("raceWeekId");
