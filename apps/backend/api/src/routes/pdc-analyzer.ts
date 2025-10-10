import { Router } from "express";
import { db } from "../core/db";
import { eq, and, desc, sql as drizzleSql } from "drizzle-orm";
import multer from "multer";
import { aiPdcAnalysisSessions, aiPdcTrainingDataset } from "../db/schema/brand-interface";
import { enforceAIEnabled, enforceAgentEnabled } from "../middleware/ai-enforcement";
import { tenantMiddleware, rbacMiddleware } from "../middleware/tenant";
import OpenAI from "openai";

const router = Router();

// Apply middleware
router.use(tenantMiddleware);
router.use(rbacMiddleware);

// Configure multer for PDF upload (memory storage for processing)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/pdc/sessions
 * Create a new PDC analysis session
 */
router.post("/sessions", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Session name is required" });
    }

    const [session] = await db
      .insert(aiPdcAnalysisSessions)
      .values({
        tenantId,
        sessionName: name,
        totalPdfs: 0,
        analyzedPdfs: 0,
        reviewedPdfs: 0,
        status: "active",
        createdBy: userId,
      })
      .returning();

    res.json(session);
  } catch (error) {
    console.error("Error creating PDC session:", error);
    res.status(500).json({ error: "Failed to create session" });
  }
});

/**
 * GET /api/pdc/sessions
 * Get all PDC analysis sessions for the tenant
 */
router.get("/sessions", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const sessions = await db
      .select()
      .from(aiPdcAnalysisSessions)
      .where(eq(aiPdcAnalysisSessions.tenantId, tenantId))
      .orderBy(desc(aiPdcAnalysisSessions.createdAt));

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching PDC sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * GET /api/pdc/sessions/:sessionId
 * Get a specific PDC analysis session with training data
 */
router.get("/sessions/:sessionId", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { sessionId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const [session] = await db
      .select()
      .from(aiPdcAnalysisSessions)
      .where(
        and(
          eq(aiPdcAnalysisSessions.id, sessionId),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get training data for this session
    const trainingData = await db
      .select()
      .from(aiPdcTrainingDataset)
      .where(eq(aiPdcTrainingDataset.sessionId, sessionId))
      .orderBy(desc(aiPdcTrainingDataset.analyzedAt));

    res.json({
      ...session,
      trainingData,
    });
  } catch (error) {
    console.error("Error fetching PDC session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

/**
 * POST /api/pdc/analyze
 * Upload and analyze a PDF contract proposal using AI
 * 
 * IMPORTANT: GPT-4 Vision does NOT support PDF input via data URLs.
 * This endpoint uses text extraction + GPT-4 for now.
 * TODO: Implement PDF-to-image conversion for true OCR with Vision API
 */
router.post("/analyze", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), upload.single("pdf"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { sessionId } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Verify session exists and belongs to tenant
    const [session] = await db
      .select()
      .from(aiPdcAnalysisSessions)
      .where(
        and(
          eq(aiPdcAnalysisSessions.id, sessionId),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Extract text from PDF (using pdf-parse library)
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;

    // Call GPT-4 (not Vision) for text-based analysis
    // Note: For true OCR of scanned PDFs, we need to convert PDF pages to images first
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di analisi documentale specializzato nell'estrazione di dati da proposte di contratto (PDC) WindTre.

**OBIETTIVO**: Estrarre anagrafica cliente, servizi venduti, e mapping prodotti da testo PDF, generando JSON strutturato.

**GERARCHIA PRODOTTI**:
1. **Driver** (livello 1): Fisso, Mobile, Energia, Assicurazione, Protecta, Customer Base
2. **Categoria** (livello 2): es. Mobile → Ricaricabile, Mobile → Abbonamento
3. **Tipologia** (livello 3): es. Ricaricabile → Prepagata, Abbonamento → Postpagato  
4. **Prodotto** (livello 4): descrizione libera nel PDF da mappare

**FORMATO OUTPUT JSON**:
{
  "customer": {
    "type": "private|business",
    "firstName": "...",
    "lastName": "...",
    "fiscalCode": "...",
    "phone": "...",
    "email": "...",
    "address": { "street": "...", "city": "...", "zip": "...", "province": "..." }
  },
  "services": [
    {
      "driver": "Mobile",
      "category": "Abbonamento",
      "typology": "Postpagato",
      "product": {
        "description": "WindTre Top 50GB",
        "price": 14.99,
        "duration": "30 giorni",
        "activationDate": "2025-10-15"
      }
    }
  ],
  "confidence": 95,
  "extractionNotes": "eventuali note su campi ambigui"
}

Rispondi SEMPRE con JSON valido.`,
        },
        {
          role: "user",
          content: `Analizza questa proposta contrattuale WindTre ed estrai tutti i dati:\n\n${pdfText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 3000,
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || "{}");

    // Use database transaction to ensure atomicity
    const [trainingEntry] = await db.transaction(async (tx) => {
      // Insert training entry
      const [entry] = await tx
        .insert(aiPdcTrainingDataset)
        .values({
          sessionId,
          tenantId,
          pdfFileName: req.file!.originalname,
          pdfFileSize: req.file!.size,
          aiRawOutput: analysisResult,
          confidenceScore: analysisResult.confidence || 0,
          isReviewed: false,
          analyzedBy: userId,
        })
        .returning();

      // Update session stats atomically
      await tx
        .update(aiPdcAnalysisSessions)
        .set({
          totalPdfs: drizzleSql`${aiPdcAnalysisSessions.totalPdfs} + 1`,
          analyzedPdfs: drizzleSql`${aiPdcAnalysisSessions.analyzedPdfs} + 1`,
        })
        .where(eq(aiPdcAnalysisSessions.id, sessionId));

      return [entry];
    });

    res.json({
      trainingEntry,
      analysis: analysisResult,
    });
  } catch (error) {
    console.error("Error uploading and analyzing PDF:", error);
    res.status(500).json({ error: "Failed to upload and analyze PDF" });
  }
});

/**
 * POST /api/pdc/training
 * Review and correct AI analysis (provides training feedback)
 */
router.post("/training", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { entryId, correctedOutput, reviewNotes } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!entryId || !correctedOutput) {
      return res.status(400).json({ error: "Entry ID and corrected output are required" });
    }

    // Use transaction to prevent double-increment of reviewedPdfs
    const [updatedEntry] = await db.transaction(async (tx) => {
      // Get current entry state
      const [currentEntry] = await tx
        .select()
        .from(aiPdcTrainingDataset)
        .where(
          and(
            eq(aiPdcTrainingDataset.id, entryId),
            eq(aiPdcTrainingDataset.tenantId, tenantId)
          )
        )
        .limit(1);

      if (!currentEntry) {
        throw new Error("Training entry not found");
      }

      const wasAlreadyReviewed = currentEntry.isReviewed;

      // Update training entry
      const [entry] = await tx
        .update(aiPdcTrainingDataset)
        .set({
          humanCorrectedOutput: correctedOutput,
          reviewNotes,
          isReviewed: true,
          reviewedBy: userId,
          reviewedAt: new Date(),
        })
        .where(eq(aiPdcTrainingDataset.id, entryId))
        .returning();

      // Only increment reviewedPdfs if this is the first review
      if (!wasAlreadyReviewed) {
        await tx
          .update(aiPdcAnalysisSessions)
          .set({
            reviewedPdfs: drizzleSql`${aiPdcAnalysisSessions.reviewedPdfs} + 1`,
          })
          .where(eq(aiPdcAnalysisSessions.id, currentEntry.sessionId));
      }

      return [entry];
    });

    res.json(updatedEntry);
  } catch (error) {
    console.error("Error reviewing training entry:", error);
    if (error instanceof Error && error.message === "Training entry not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to review training entry" });
  }
});

/**
 * GET /api/pdc/export/:sessionId
 * Export session data as JSON for cashier API integration
 */
router.get("/export/:sessionId", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { sessionId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get session
    const [session] = await db
      .select()
      .from(aiPdcAnalysisSessions)
      .where(
        and(
          eq(aiPdcAnalysisSessions.id, sessionId),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get all training data for this session
    const trainingData = await db
      .select()
      .from(aiPdcTrainingDataset)
      .where(eq(aiPdcTrainingDataset.sessionId, sessionId))
      .orderBy(aiPdcTrainingDataset.analyzedAt);

    // Build export data using human-corrected output if available, otherwise AI output
    const exportData = trainingData.map((entry) => ({
      fileName: entry.pdfFileName,
      confidence: entry.confidenceScore,
      data: entry.isReviewed && entry.humanCorrectedOutput
        ? entry.humanCorrectedOutput
        : entry.aiRawOutput,
      reviewed: entry.isReviewed,
      reviewNotes: entry.reviewNotes,
      analyzedAt: entry.analyzedAt,
      reviewedAt: entry.reviewedAt,
    }));

    const exportPayload = {
      sessionId: session.id,
      sessionName: session.sessionName,
      tenantId: session.tenantId,
      totalPdfs: session.totalPdfs,
      analyzedPdfs: session.analyzedPdfs,
      reviewedPdfs: session.reviewedPdfs,
      createdAt: session.createdAt,
      data: exportData,
    };

    res.json(exportPayload);
  } catch (error) {
    console.error("Error exporting session:", error);
    res.status(500).json({ error: "Failed to export session" });
  }
});

/**
 * DELETE /api/pdc/sessions/:sessionId
 * Delete a PDC analysis session and all associated training data
 */
router.delete("/sessions/:sessionId", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { sessionId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Use transaction for atomic delete
    await db.transaction(async (tx) => {
      // Delete training data first (foreign key constraint)
      await tx
        .delete(aiPdcTrainingDataset)
        .where(
          and(
            eq(aiPdcTrainingDataset.sessionId, sessionId),
            eq(aiPdcTrainingDataset.tenantId, tenantId)
          )
        );

      // Delete session
      const [deletedSession] = await tx
        .delete(aiPdcAnalysisSessions)
        .where(
          and(
            eq(aiPdcAnalysisSessions.id, sessionId),
            eq(aiPdcAnalysisSessions.tenantId, tenantId)
          )
        )
        .returning();

      if (!deletedSession) {
        throw new Error("Session not found");
      }
    });

    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session:", error);
    if (error instanceof Error && error.message === "Session not found") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
