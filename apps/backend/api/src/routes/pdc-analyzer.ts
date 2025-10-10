import { Router } from "express";
import { db } from "../core/db";
import { eq, and, desc, sql as drizzleSql } from "drizzle-orm";
import multer from "multer";
import { 
  aiPdcAnalysisSessions, 
  aiPdcTrainingDataset,
  aiPdcPdfUploads,
  aiPdcExtractedData,
  aiPdcServiceMapping
} from "../db/schema/brand-interface";
import { drivers, driverCategories, driverTypologies } from "../db/schema/public";
import { enforceAIEnabled, enforceAgentEnabled } from "../middleware/ai-enforcement";
import { tenantMiddleware, rbacMiddleware } from "../middleware/tenant";
import OpenAI from "openai";
import crypto from "crypto";
import { createRequire } from "module";

// Import pdf-parse using createRequire (CommonJS module)
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); // Default export is the function!

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

// Note: Object Storage temporarily disabled due to configuration issues
// Using in-memory storage for PDF processing

/**
 * Extract text from PDF using pdf-parse
 * Simple and reliable extraction for Node.js
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('📄 [PDF-EXTRACT] Starting text extraction with pdf-parse...');
    
    const data = await pdfParse(pdfBuffer);
    
    console.log(`✅ [PDF-EXTRACT] Extracted ${data.text.length} characters from ${data.numpages} pages`);
    
    if (!data.text || data.text.trim().length < 50) {
      throw new Error('PDF contains insufficient text (might be scanned/image-based)');
    }
    
    return data.text.trim();
  } catch (error) {
    console.error('❌ [PDF-EXTRACT] Error extracting text:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

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

    const { sessionName } = req.body;

    if (!sessionName || typeof sessionName !== "string") {
      return res.status(400).json({ error: "Session name is required" });
    }

    const [session] = await db
      .insert(aiPdcAnalysisSessions)
      .values({
        tenantId,
        userId,
        sessionName,
        totalPdfs: 0,
        processedPdfs: 0,
        status: "pending",
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
 * Get a specific PDC analysis session with ALL related data
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

    // Get extracted data for this session
    const extractedData = await db
      .select()
      .from(aiPdcExtractedData)
      .where(eq(aiPdcExtractedData.sessionId, sessionId))
      .orderBy(desc(aiPdcExtractedData.createdAt));

    // Get service mappings for this session
    const serviceMappings = await db
      .select()
      .from(aiPdcServiceMapping)
      .where(eq(aiPdcServiceMapping.sessionId, sessionId));

    // Get PDF uploads for this session
    const pdfUploads = await db
      .select()
      .from(aiPdcPdfUploads)
      .where(eq(aiPdcPdfUploads.sessionId, sessionId))
      .orderBy(desc(aiPdcPdfUploads.uploadedAt));

    res.json({
      ...session,
      trainingData,
      extractedData,
      serviceMappings,
      pdfUploads,
    });
  } catch (error) {
    console.error("Error fetching PDC session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

/**
 * POST /api/pdc/sessions/:sessionId/upload
 * Upload PDF to session and analyze with GPT-4o
 */
router.post("/sessions/:sessionId/upload", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), upload.single("pdf"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { sessionId } = req.params;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "PDF file is required" });
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

    // Save PDF locally for now (simplified approach)
    let fileUrl: string;
    try {
      // Create a simple local path for the PDF
      const fileName = `${Date.now()}-${req.file.originalname}`;
      fileUrl = `/temp-pdfs/${fileName}`;
      
      console.log('📦 [PDC-UPLOAD] Processing PDF file:', req.file.originalname);
      console.log('📦 [PDC-UPLOAD] File size:', req.file.size, 'bytes');
      console.log('✅ [PDC-UPLOAD] PDF ready for processing (stored in memory)');
    } catch (storageError: any) {
      console.error('❌ [PDC-UPLOAD] Error processing PDF:', storageError);
      return res.status(500).json({ 
        error: "Failed to process PDF",
        details: storageError.message 
      });
    }

    // Create PDF upload record
    const [pdfUpload] = await db
      .insert(aiPdcPdfUploads)
      .values({
        sessionId,
        fileName: req.file.originalname,
        fileUrl,
        fileHash: crypto.createHash('sha256').update(req.file.buffer).digest('hex'),
        fileSize: req.file.size,
        status: 'analyzing',
      })
      .returning();

    // Extract text from PDF using pdfjs-dist
    console.log('📄 [PDC-UPLOAD] Extracting text from PDF...');
    let pdfText: string;
    try {
      pdfText = await extractTextFromPDF(req.file.buffer);
      
      if (!pdfText || pdfText.length < 50) {
        throw new Error('PDF appears to be empty or contains only images. Text extraction yielded insufficient content.');
      }
      
      console.log(`✅ [PDC-UPLOAD] Text extracted successfully: ${pdfText.length} characters`);
    } catch (extractError) {
      console.error('❌ [PDC-UPLOAD] PDF text extraction failed:', extractError);
      
      // Update PDF status to failed (without extractionError field for now)
      await db
        .update(aiPdcPdfUploads)
        .set({
          status: 'failed',
        })
        .where(eq(aiPdcPdfUploads.id, pdfUpload.id));
      
      return res.status(400).json({ 
        error: "Failed to extract text from PDF",
        details: extractError instanceof Error ? extractError.message : 'Unknown error',
        suggestion: "Il PDF potrebbe essere completamente scansionato o protetto. Prova con un PDF con testo selezionabile."
      });
    }

    console.log('🤖 [PDC-AI] Analyzing PDF text with GPT-4o...');

    // Analyze extracted text with GPT-4o
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di analisi documentale specializzato nell'estrazione di dati da proposte di contratto (PDC) WindTre.

**OBIETTIVO**: Estrarre anagrafica cliente, servizi venduti, e mapping prodotti dal testo PDF, generando JSON strutturato.

**GERARCHIA PRODOTTI WINDTRE**:
1. **Driver** (livello 1): Fisso, Mobile, Energia, Assicurazione, Protecta, Customer Base
2. **Categoria** (livello 2): es. Mobile → Ricaricabile, Mobile → Abbonamento, Fisso → Fibra
3. **Tipologia** (livello 3): es. Ricaricabile → Prepagata, Abbonamento → Postpagato, Fibra → FTTH
4. **Prodotto** (livello 4): descrizione commerciale (es. "Super Fibra 1 Giga", "Smart 50GB")

**FORMATO OUTPUT JSON**:
{
  "customer": {
    "type": "private|business",
    "firstName": "...",
    "lastName": "...",
    "fiscalCode": "...",
    "phone": "...",
    "email": "...",
    "address": {
      "street": "...",
      "city": "...",
      "zip": "...",
      "province": "..."
    }
  },
  "services": [
    {
      "driver": "Mobile|Fisso|Energia|...",
      "category": "Abbonamento|Ricaricabile|Fibra|...",
      "typology": "Postpagato|Prepagata|FTTH|...",
      "productDescription": "Nome commerciale prodotto",
      "price": 14.99,
      "duration": "24 mesi|30 giorni",
      "activationDate": "YYYY-MM-DD"
    }
  ],
  "confidence": 95,
  "extractionNotes": "eventuali note su campi ambigui o mancanti"
}

**REGOLE**:
- Estrai SOLO dati realmente presenti nel testo
- Se un campo è ambiguo o mancante, segnalalo in extractionNotes
- confidence deve riflettere la certezza dei dati estratti (0-100)
- Per servizi multipli, crea array con tutti i prodotti trovati
- Se è un cliente business, usa businessName invece di firstName/lastName

Rispondi SEMPRE con JSON valido.`,
        },
        {
          role: "user",
          content: `Analizza questa proposta contrattuale WindTre ed estrai tutti i dati come JSON strutturato.\n\n**TESTO PDF**:\n${pdfText}`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 2000,
    });

    const analysisResult = JSON.parse(response.choices[0].message.content || "{}");

    // Save extracted data
    const [extractedData] = await db
      .insert(aiPdcExtractedData)
      .values({
        pdfId: pdfUpload.id,
        sessionId,
        customerType: analysisResult.customer?.type || 'private',
        customerData: analysisResult.customer || {},
        servicesExtracted: analysisResult.services || [],
        aiRawOutput: analysisResult,
        extractionMethod: 'gpt-4o',
      })
      .returning();

    // Update PDF upload status
    await db
      .update(aiPdcPdfUploads)
      .set({
        status: 'completed',
        aiConfidence: analysisResult.confidence,
        analyzedAt: new Date(),
      })
      .where(eq(aiPdcPdfUploads.id, pdfUpload.id));

    // Update session counters
    await db
      .update(aiPdcAnalysisSessions)
      .set({
        totalPdfs: drizzleSql`${aiPdcAnalysisSessions.totalPdfs} + 1`,
        processedPdfs: drizzleSql`${aiPdcAnalysisSessions.processedPdfs} + 1`,
      })
      .where(eq(aiPdcAnalysisSessions.id, sessionId));

    res.json({
      id: pdfUpload.id,
      fileName: req.file.originalname,
      status: 'completed',
      analysis: {
        customer: analysisResult.customer,
        services: analysisResult.services,
        confidence: analysisResult.confidence,
        notes: analysisResult.extractionNotes,
      },
      extractedDataId: extractedData.id,
    });
  } catch (error) {
    console.error("❌ [PDC-UPLOAD] Error analyzing PDF:", error);
    console.error("❌ [PDC-UPLOAD] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("❌ [PDC-UPLOAD] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown',
    });
    res.status(500).json({ 
      error: "Failed to analyze PDF",
      details: error instanceof Error ? error.message : String(error)
    });
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

    // Call GPT-4o (has vision capabilities built-in for better text extraction)
    // Note: For 100% scanned PDFs (pure images), ideal solution: convert PDF→Images→Vision API
    // TODO: Implement pdf2pic for full OCR: PDF pages → Base64 images → gpt-4o vision
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
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
          content: [
            {
              type: "text",
              text: "Analizza questa proposta contrattuale WindTre ed estrai tutti i dati come JSON strutturato. Leggi attentamente ogni pagina del PDF."
            },
            {
              type: "image_url",
              image_url: {
                url: pdfDataUrl,
                detail: "high"
              }
            }
          ],
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

    console.log(`🗑️ [DELETE] Starting delete for session: ${sessionId}, tenant: ${tenantId}`);

    // Simplified delete - just delete session, cascades handle the rest
    const [deletedSession] = await db
      .delete(aiPdcAnalysisSessions)
      .where(
        and(
          eq(aiPdcAnalysisSessions.id, sessionId),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      )
      .returning();

    if (!deletedSession) {
      console.error(`❌ [DELETE] Session not found: ${sessionId}`);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log(`✅ [DELETE] Session deleted successfully: ${sessionId}`);
    res.json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("❌ [DELETE] Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
});

/**
 * GET /api/pdc/extracted/:id
 * Get extracted data for review
 */
router.get("/extracted/:id", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get extracted data with PDF info
    const [extractedData] = await db
      .select({
        id: aiPdcExtractedData.id,
        pdfId: aiPdcExtractedData.pdfId,
        sessionId: aiPdcExtractedData.sessionId,
        customerType: aiPdcExtractedData.customerType,
        customerData: aiPdcExtractedData.customerData,
        servicesExtracted: aiPdcExtractedData.servicesExtracted,
        aiRawOutput: aiPdcExtractedData.aiRawOutput,
        extractionMethod: aiPdcExtractedData.extractionMethod,
        wasReviewed: aiPdcExtractedData.wasReviewed,
        reviewedBy: aiPdcExtractedData.reviewedBy,
        correctedData: aiPdcExtractedData.correctedData,
        reviewNotes: aiPdcExtractedData.reviewNotes,
        createdAt: aiPdcExtractedData.createdAt,
        reviewedAt: aiPdcExtractedData.reviewedAt,
        pdfFileName: aiPdcPdfUploads.fileName,
        pdfUrl: aiPdcPdfUploads.fileUrl,
      })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcPdfUploads, eq(aiPdcExtractedData.pdfId, aiPdcPdfUploads.id))
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!extractedData) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    res.json(extractedData);
  } catch (error) {
    console.error("Error fetching extracted data:", error);
    res.status(500).json({ error: "Failed to fetch extracted data" });
  }
});

/**
 * PUT /api/pdc/extracted/:id/review
 * Submit human review corrections
 */
router.put("/extracted/:id/review", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { correctedData, reviewNotes } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!correctedData) {
      return res.status(400).json({ error: "Corrected data is required" });
    }

    // Verify ownership
    const [existing] = await db
      .select({ sessionId: aiPdcExtractedData.sessionId })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!existing) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    // Update with corrections
    const [updated] = await db
      .update(aiPdcExtractedData)
      .set({
        correctedData,
        reviewNotes,
        wasReviewed: true,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })
      .where(eq(aiPdcExtractedData.id, id))
      .returning();

    res.json({
      message: "Review submitted successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ error: "Failed to submit review" });
  }
});

/**
 * GET /api/pdc/extracted/:id/service-mapping
 * Get service mappings for extracted data
 */
router.get("/extracted/:id/service-mapping", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Verify ownership
    const [extractedData] = await db
      .select({ id: aiPdcExtractedData.id })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!extractedData) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    // Get mappings
    const mappings = await db
      .select()
      .from(aiPdcServiceMapping)
      .where(eq(aiPdcServiceMapping.extractedDataId, id))
      .orderBy(aiPdcServiceMapping.serviceIndex);

    res.json({ mappings });
  } catch (error) {
    console.error("Error fetching service mappings:", error);
    res.status(500).json({ error: "Failed to fetch service mappings" });
  }
});

/**
 * POST /api/pdc/extracted/:id/service-mapping
 * Create or update service mapping to WindTre hierarchy
 */
router.post("/extracted/:id/service-mapping", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { 
      serviceIndex, 
      driverSelected, 
      categorySelected, 
      typologySelected, 
      productMatched,
      matchConfidence = 100,
      mappingNotes 
    } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (serviceIndex === undefined || !driverSelected) {
      return res.status(400).json({ error: "Service index and driver are required" });
    }

    // Verify ownership
    const [extractedData] = await db
      .select({ id: aiPdcExtractedData.id })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!extractedData) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    // Check if mapping already exists
    const [existingMapping] = await db
      .select()
      .from(aiPdcServiceMapping)
      .where(
        and(
          eq(aiPdcServiceMapping.extractedDataId, id),
          eq(aiPdcServiceMapping.serviceIndex, serviceIndex)
        )
      );

    let mapping;

    if (existingMapping) {
      // Update existing mapping
      [mapping] = await db
        .update(aiPdcServiceMapping)
        .set({
          driverSelected,
          categorySelected,
          typologySelected,
          productMatched,
          matchConfidence,
          mappingNotes,
          mappedBy: userId,
          mappedAt: new Date(),
        })
        .where(eq(aiPdcServiceMapping.id, existingMapping.id))
        .returning();
    } else {
      // Create new mapping
      [mapping] = await db
        .insert(aiPdcServiceMapping)
        .values({
          extractedDataId: id,
          serviceIndex,
          driverSelected,
          categorySelected,
          typologySelected,
          productMatched,
          matchConfidence,
          mappingNotes,
          mappedBy: userId,
        })
        .returning();
    }

    res.json({
      message: existingMapping ? "Mapping updated successfully" : "Mapping created successfully",
      mapping,
    });
  } catch (error) {
    console.error("Error saving service mapping:", error);
    res.status(500).json({ error: "Failed to save service mapping" });
  }
});

/**
 * GET /api/pdc/extracted/:id/export
 * Export final JSON for cash register integration
 */
router.get("/extracted/:id/export", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { id } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get extracted data
    const [extractedData] = await db
      .select({
        id: aiPdcExtractedData.id,
        wasReviewed: aiPdcExtractedData.wasReviewed,
        aiRawOutput: aiPdcExtractedData.aiRawOutput,
        correctedData: aiPdcExtractedData.correctedData,
        customerData: aiPdcExtractedData.customerData,
        servicesExtracted: aiPdcExtractedData.servicesExtracted,
        pdfFileName: aiPdcPdfUploads.fileName,
      })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcPdfUploads, eq(aiPdcExtractedData.pdfId, aiPdcPdfUploads.id))
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!extractedData) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    // Use corrected data if reviewed, otherwise AI output
    const finalData = extractedData.wasReviewed && extractedData.correctedData
      ? extractedData.correctedData
      : extractedData.aiRawOutput;

    // Get service mappings if they exist
    const serviceMappings = await db
      .select()
      .from(aiPdcServiceMapping)
      .where(eq(aiPdcServiceMapping.extractedDataId, id));

    // Build export JSON for cash register
    const exportJson = {
      customer: finalData.customer || {},
      services: (finalData.services || []).map((service: any, index: number) => {
        const mapping = serviceMappings.find(m => m.serviceIndex === index);
        return {
          ...service,
          windtreMapping: mapping ? {
            driver: mapping.driverSelected,
            category: mapping.categorySelected,
            typology: mapping.typologySelected,
            product: mapping.productMatched,
            confidence: mapping.matchConfidence,
          } : null,
        };
      }),
      metadata: {
        extractedFrom: extractedData.pdfFileName,
        extractedAt: new Date().toISOString(),
        wasHumanReviewed: extractedData.wasReviewed,
        exportedBy: tenantId,
      },
    };

    // Set content disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="pdc-export-${id}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportJson);
  } catch (error) {
    console.error("Error exporting JSON:", error);
    res.status(500).json({ error: "Failed to export JSON" });
  }
});

/**
 * POST /api/pdc/extracted/:id/training
 * Save reviewed data to cross-tenant training dataset
 */
router.post("/extracted/:id/training", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const { id } = req.params;
    const { isPublic = true, trainingPrompt } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get reviewed data with PDF info
    const [extractedData] = await db
      .select({
        extractedId: aiPdcExtractedData.id,
        sessionId: aiPdcExtractedData.sessionId,
        pdfUrl: aiPdcPdfUploads.fileUrl,
        pdfFileName: aiPdcPdfUploads.fileName,
        pdfHash: aiPdcPdfUploads.fileHash,
        aiRawOutput: aiPdcExtractedData.aiRawOutput,
        correctedData: aiPdcExtractedData.correctedData,
        wasReviewed: aiPdcExtractedData.wasReviewed,
      })
      .from(aiPdcExtractedData)
      .innerJoin(aiPdcPdfUploads, eq(aiPdcExtractedData.pdfId, aiPdcPdfUploads.id))
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcExtractedData.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcExtractedData.id, id),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      );

    if (!extractedData) {
      return res.status(404).json({ error: "Extracted data not found" });
    }

    if (!extractedData.wasReviewed) {
      return res.status(400).json({ error: "Data must be reviewed before saving to training" });
    }

    // Check if already in training dataset (by PDF hash)
    const [existingTraining] = await db
      .select()
      .from(aiPdcTrainingDataset)
      .where(eq(aiPdcTrainingDataset.pdfHash, extractedData.pdfHash || ''));

    if (existingTraining) {
      return res.status(409).json({ 
        error: "This PDF is already in the training dataset",
        trainingId: existingTraining.id 
      });
    }

    // Save to training dataset
    const [trainingEntry] = await db
      .insert(aiPdcTrainingDataset)
      .values({
        sessionId: extractedData.sessionId,
        pdfUrl: extractedData.pdfUrl,
        pdfFileName: extractedData.pdfFileName,
        pdfHash: extractedData.pdfHash,
        aiExtractedData: extractedData.aiRawOutput,
        aiModel: 'gpt-4o',
        correctedJson: extractedData.correctedData,
        correctionNotes: trainingPrompt || '',
        validatedBy: userId,
        isPublicTraining: isPublic,
        sourceTenantId: tenantId,
      })
      .returning();

    res.json({
      message: "Successfully added to training dataset",
      trainingEntry,
      crossTenant: isPublic,
    });
  } catch (error) {
    console.error("Error saving to training:", error);
    res.status(500).json({ error: "Failed to save to training dataset" });
  }
});

/**
 * POST /api/pdc/sessions/:sessionId/finalize
 * Finalize a PDC analysis session (change status from pending to completed)
 */
router.post("/sessions/:sessionId/finalize", enforceAIEnabled, enforceAgentEnabled("pdc-analyzer"), async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    const { sessionId } = req.params;

    if (!tenantId) {
      return res.status(401).json({ error: "Authentication required" });
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

    if (session.status !== "pending") {
      return res.status(400).json({ 
        error: "Only pending sessions can be finalized",
        currentStatus: session.status 
      });
    }

    // Update session status to completed
    const [updatedSession] = await db
      .update(aiPdcAnalysisSessions)
      .set({ 
        status: "completed",
        completedAt: new Date()
      })
      .where(eq(aiPdcAnalysisSessions.id, sessionId))
      .returning();

    res.json({
      message: "Session finalized successfully",
      session: updatedSession,
    });
  } catch (error) {
    console.error("Error finalizing session:", error);
    res.status(500).json({ error: "Failed to finalize session" });
  }
});

/**
 * GET /api/pdc/drivers/hierarchy
 * Get complete WindTre product hierarchy: Drivers → Categories → Typologies
 */
router.get("/drivers/hierarchy", async (req, res) => {
  try {
    // Get all drivers
    const allDrivers = await db
      .select()
      .from(drivers)
      .where(eq(drivers.active, true))
      .orderBy(drivers.name);

    // Get all categories
    const allCategories = await db
      .select()
      .from(driverCategories)
      .where(eq(driverCategories.active, true))
      .orderBy(driverCategories.sortOrder);

    // Get all typologies
    const allTypologies = await db
      .select()
      .from(driverTypologies)
      .where(eq(driverTypologies.active, true))
      .orderBy(driverTypologies.sortOrder);

    // Build hierarchy
    const hierarchy = allDrivers.map(driver => ({
      id: driver.id,
      code: driver.code,
      name: driver.name,
      categories: allCategories
        .filter(cat => cat.driverId === driver.id)
        .map(category => ({
          id: category.id,
          code: category.code,
          name: category.name,
          description: category.description,
          typologies: allTypologies
            .filter(typ => typ.categoryId === category.id)
            .map(typology => ({
              id: typology.id,
              code: typology.code,
              name: typology.name,
              description: typology.description,
            })),
        })),
    }));

    res.json(hierarchy);
  } catch (error) {
    console.error("Error fetching drivers hierarchy:", error);
    res.status(500).json({ error: "Failed to fetch drivers hierarchy" });
  }
});

export default router;
