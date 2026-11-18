-- CreateEnum
CREATE TYPE "ChannelPhase" AS ENUM ('CANDIDATO', 'PILOTO', 'ATIVO', 'PAUSADO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "SignalType" AS ENUM ('OUTLIER', 'VELOCIDADE', 'BRECHA', 'TENDENCIA');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('NOVO', 'VIRA_PAUTA', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "PautaStatus" AS ENUM ('PROPOSTA', 'APROVADA', 'DESCARTADA', 'EM_PRODUCAO');

-- CreateEnum
CREATE TYPE "VideoStage" AS ENUM ('EMBALAGEM', 'PESQUISA', 'ROTEIRO', 'VOZ', 'MONTAGEM', 'REVISAO', 'AGENDADO', 'NO_AR', 'ANALISE');

-- CreateEnum
CREATE TYPE "RevisionTarget" AS ENUM ('PAUTA', 'EMBALAGEM', 'ROTEIRO');

-- CreateEnum
CREATE TYPE "Author" AS ENUM ('USUARIO', 'CLAUDE', 'LLM', 'SISTEMA');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('NARRACAO', 'RENDER', 'CORTE', 'THUMB', 'FONTE', 'OUTRO');

-- CreateTable
CREATE TABLE "DarkChannel" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "handle" TEXT,
    "niche" TEXT NOT NULL,
    "phase" "ChannelPhase" NOT NULL DEFAULT 'CANDIDATO',
    "profile" JSONB NOT NULL DEFAULT '{}',
    "identity" JSONB NOT NULL DEFAULT '{}',
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "projectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DarkChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceChannel" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT,
    "subscribers" INTEGER,
    "videoCount" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "uploadsPlaylistId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastCollectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelReference" (
    "darkChannelId" TEXT NOT NULL,
    "referenceChannelId" TEXT NOT NULL,
    "note" TEXT,
    "addedBy" "Author" NOT NULL DEFAULT 'USUARIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelReference_pkey" PRIMARY KEY ("darkChannelId","referenceChannelId")
);

-- CreateTable
CREATE TABLE "RefVideo" (
    "id" TEXT NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "channelId" TEXT,
    "title" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "durationSec" INTEGER,
    "thumbUrl" TEXT,
    "origin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefVideoSnapshot" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "views" INTEGER NOT NULL,
    "likes" INTEGER,
    "comments" INTEGER,

    CONSTRAINT "RefVideoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "type" "SignalType" NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "multiple" DOUBLE PRECISION,
    "baseline" DOUBLE PRECISION,
    "status" "SignalStatus" NOT NULL DEFAULT 'NOVO',
    "note" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotaUsage" (
    "day" DATE NOT NULL,
    "units" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuotaUsage_pkey" PRIMARY KEY ("day")
);

-- CreateTable
CREATE TABLE "Pauta" (
    "id" TEXT NOT NULL,
    "darkChannelId" TEXT NOT NULL,
    "signalId" TEXT,
    "thesis" TEXT NOT NULL,
    "angle" TEXT,
    "titles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PautaStatus" NOT NULL DEFAULT 'PROPOSTA',
    "createdBy" "Author" NOT NULL DEFAULT 'CLAUDE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pauta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Video" (
    "id" TEXT NOT NULL,
    "darkChannelId" TEXT NOT NULL,
    "pautaId" TEXT NOT NULL,
    "stage" "VideoStage" NOT NULL DEFAULT 'EMBALAGEM',
    "title" TEXT,
    "stageDates" JSONB NOT NULL DEFAULT '{}',
    "youtubeVideoId" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "target" "RevisionTarget" NOT NULL,
    "pautaId" TEXT,
    "videoId" TEXT,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "author" "Author" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT,
    "claim" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "objectKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "location" TEXT NOT NULL,
    "meta" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "views" INTEGER,
    "ctr" DOUBLE PRECISION,
    "avgRetention" DOUBLE PRECISION,
    "retention30s" DOUBLE PRECISION,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DarkChannel_slug_key" ON "DarkChannel"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DarkChannel_projectId_key" ON "DarkChannel"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceChannel_youtubeId_key" ON "ReferenceChannel"("youtubeId");

-- CreateIndex
CREATE UNIQUE INDEX "RefVideo_youtubeId_key" ON "RefVideo"("youtubeId");

-- CreateIndex
CREATE INDEX "RefVideo_channelId_publishedAt_idx" ON "RefVideo"("channelId", "publishedAt");

-- CreateIndex
CREATE INDEX "RefVideoSnapshot_videoId_capturedAt_idx" ON "RefVideoSnapshot"("videoId", "capturedAt");

-- CreateIndex
CREATE INDEX "Signal_status_score_idx" ON "Signal"("status", "score");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_videoId_type_key" ON "Signal"("videoId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Video_pautaId_key" ON "Video"("pautaId");

-- CreateIndex
CREATE INDEX "Video_darkChannelId_stage_idx" ON "Video"("darkChannelId", "stage");

-- CreateIndex
CREATE INDEX "Revision_videoId_target_version_idx" ON "Revision"("videoId", "target", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Revision_target_pautaId_videoId_version_key" ON "Revision"("target", "pautaId", "videoId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Metric_videoId_day_key" ON "Metric"("videoId", "day");

-- AddForeignKey
ALTER TABLE "DarkChannel" ADD CONSTRAINT "DarkChannel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReference" ADD CONSTRAINT "ChannelReference_darkChannelId_fkey" FOREIGN KEY ("darkChannelId") REFERENCES "DarkChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelReference" ADD CONSTRAINT "ChannelReference_referenceChannelId_fkey" FOREIGN KEY ("referenceChannelId") REFERENCES "ReferenceChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefVideo" ADD CONSTRAINT "RefVideo_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ReferenceChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefVideoSnapshot" ADD CONSTRAINT "RefVideoSnapshot_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "RefVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "RefVideo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pauta" ADD CONSTRAINT "Pauta_darkChannelId_fkey" FOREIGN KEY ("darkChannelId") REFERENCES "DarkChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pauta" ADD CONSTRAINT "Pauta_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "Signal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_darkChannelId_fkey" FOREIGN KEY ("darkChannelId") REFERENCES "DarkChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_pautaId_fkey" FOREIGN KEY ("pautaId") REFERENCES "Pauta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_pautaId_fkey" FOREIGN KEY ("pautaId") REFERENCES "Pauta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
