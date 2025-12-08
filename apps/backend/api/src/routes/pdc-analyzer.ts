import { Router } from "express";
import { db } from "../core/db";
import { eq, and, desc, sql } from "drizzle-orm";
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

let pdfjsLib: any = null;
let pdfjsLoadError: Error | null = null;

async function getPdfjsLib() {
  if (pdfjsLoadError) {
    throw pdfjsLoadError;
  }
  if (!pdfjsLib) {
    try {
      pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    } catch (error) {
      pdfjsLoadError = new Error(`PDF.js not available in this environment: ${error}`);
      console.warn('[PDC-ANALYZER] PDF.js failed to load - PDF extraction will be unavailable:', error);
      throw pdfjsLoadError;
    }
  }
  return pdfjsLib;
}

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

// Initialize OpenAI client (lazy - only when needed)
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}
const openai = { get client() { return getOpenAIClient(); } };

// Note: Object Storage temporarily disabled due to configuration issues
// Using in-memory storage for PDF processing

/**
 * Extract text from PDF using pdfjs-dist (Mozilla's PDF.js)
 * More robust and reliable than pdf-parse
 */
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    console.log('📄 [PDF-EXTRACT] Starting text extraction with PDF.js...');
    console.log(`📄 [PDF-EXTRACT] Buffer size: ${pdfBuffer.length} bytes`);
    
    // Validate buffer
    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('Empty PDF buffer received');
    }
    
    // Check if it's a valid PDF
    const pdfHeader = pdfBuffer.toString('utf8', 0, 5);
    if (!pdfHeader.startsWith('%PDF')) {
      throw new Error('Invalid PDF file - missing PDF header');
    }
    
    // Load PDF.js library (lazy loading to prevent crash on non-browser environments)
    const pdfjs = await getPdfjsLib();
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      standardFontDataUrl: undefined,
    });
    
    const pdfDocument = await loadingTask.promise;
    const numPages = pdfDocument.numPages;
    
    console.log(`📄 [PDF-EXTRACT] PDF has ${numPages} pages`);
    
    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`✅ [PDF-EXTRACT] Extracted ${fullText.length} characters from ${numPages} pages`);
    console.log(`📄 [PDF-EXTRACT] First 100 chars: ${fullText.substring(0, 100)}`);
    
    if (!fullText || fullText.trim().length < 50) {
      throw new Error('PDF contains insufficient text (might be scanned/image-based)');
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('❌ [PDF-EXTRACT] Error extracting text:', error);
    console.error('❌ [PDF-EXTRACT] Error stack:', error instanceof Error ? error.stack : 'No stack');
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
      .orderBy(desc(aiPdcTrainingDataset.createdAt));

    // Get extracted data for this session
    const extractedData = await db
      .select()
      .from(aiPdcExtractedData)
      .where(eq(aiPdcExtractedData.sessionId, sessionId))
      .orderBy(desc(aiPdcExtractedData.createdAt));

    // Get service mappings for this session (via extractedData join)
    const serviceMappings = await db
      .select({
        id: aiPdcServiceMapping.id,
        extractedDataId: aiPdcServiceMapping.extractedDataId,
        serviceTextExtracted: aiPdcServiceMapping.serviceTextExtracted,
        serviceDescription: aiPdcServiceMapping.serviceDescription,
        driverId: aiPdcServiceMapping.driverId,
        categoryId: aiPdcServiceMapping.categoryId,
        typologyId: aiPdcServiceMapping.typologyId,
        productId: aiPdcServiceMapping.productId,
        mappingConfidence: aiPdcServiceMapping.mappingConfidence,
        mappingMethod: aiPdcServiceMapping.mappingMethod,
        mappedBy: aiPdcServiceMapping.mappedBy,
        createdAt: aiPdcServiceMapping.createdAt,
      })
      .from(aiPdcServiceMapping)
      .innerJoin(aiPdcExtractedData, eq(aiPdcServiceMapping.extractedDataId, aiPdcExtractedData.id))
      .where(eq(aiPdcExtractedData.sessionId, sessionId));

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
    const response = await openai.client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sei un esperto di analisi documentale specializzato nell'estrazione di dati da proposte di contratto (PDC) WindTre.

**OBIETTIVO**: Estrarre TUTTA l'anagrafica cliente completa, servizi venduti, e mapping prodotti dal testo PDF.

**GERARCHIA PRODOTTI WINDTRE**:
1. **Driver**: Fisso, Mobile, Energia, Assicurazione, Protecta, Customer Base
2. **Categoria**: es. Mobile → Ricaricabile/Abbonamento, Fisso → Fibra/ADSL
3. **Tipologia**: es. Ricaricabile → Prepagata, Abbonamento → Postpagato, Fibra → FTTH/FTTC
4. **Prodotto**: descrizione commerciale (es. "Super Fibra 2,5 Giga & Netflix")

**FORMATO OUTPUT JSON (ALLINEATO A MODAL SUPPLIER/USER W3SUITE)**:
{
  "customer": {
    "type": "consumer|business",
    
    // ===== CONSUMER (B2C) - Campi da Modal User =====
    "firstName": "...",
    "lastName": "...",
    "fiscalCode": "...",      // taxCode italiano
    "email": "...",
    "phone": "...",           // formato italiano +39
    "birthDate": "DD/MM/YYYY",
    "birthPlace": "...",
    "birthProvince": "...",
    "gender": "M|F",
    
    // ===== BUSINESS (B2B/P.IVA) - Campi da Modal Supplier =====
    "businessName": "...",    // name/legalName
    "code": "...",            // codice fornitore
    "vatNumber": "...",       // P.IVA 11 cifre
    "taxCode": "...",         // Codice Fiscale 16 caratteri
    "legalName": "...",       // ragione sociale completa
    "legalForm": "SRL|SPA|SNCDID|...",
    "pecEmail": "...",        // PEC certificata
    "sdiCode": "...",         // SDI 7 caratteri
    "website": "...",
    "splitPayment": true|false,
    "withholdingTax": true|false,
    
    // REFERENTE AZIENDALE (per Business)
    "contactPerson": {
      "firstName": "...",
      "lastName": "...",
      "role": "...",
      "email": "...",
      "mobilePhone": "...",     // cellulare referente (+39 3xx)
      "landlinePhone": "..."    // telefono fisso referente (+39 0xx)
    },
    
    // ===== CONTATTI COMUNI =====
    "email": "...",
    "mobilePhone": "...",     // cellulare (+39 3xx)
    "landlinePhone": "...",   // telefono fisso (+39 0xx)
    
    // ===== INDIRIZZO SEDE/RESIDENZA =====
    "address": "...",         // via e numero
    "city": "...",
    "province": "...",        // 2 caratteri (RM, MI, etc)
    "postalCode": "...",      // CAP 5 cifre
    
    // ===== INDIRIZZO INSTALLAZIONE (se diverso) =====
    "installationAddress": {
      "street": "...",
      "city": "...",
      "province": "...",
      "postalCode": "..."
    },
    
    // ===== DOCUMENTO IDENTITÀ =====
    "document": {
      "type": "CI|Passaporto|Patente",
      "number": "...",
      "issuedBy": "...",
      "issueDate": "DD/MM/YYYY",
      "expiryDate": "DD/MM/YYYY"
    },
    
    // ===== DATI BANCARI/PAGAMENTO =====
    "paymentMethod": "SDD|Bollettino|RID|...",
    "iban": "...",            // con checksum validazione
    "bic": "...",             // SWIFT code
    "bankName": "...",
    "accountHolder": "...",
    
    // ===== ALTRE INFO =====
    "notes": "...",
    "status": "active"
  },
  "additionalInfo": {
    "customerCode": "...",        // Codice Cliente
    "contractCode": "...",        // Codice Contratto
    "contractNumber": "...",      // Numero Contratto
    "promotionCode": "...",
    "salesAgent": "...",
    "store": "...",
    "campaignName": "...",
    "otherRelevantData": "qualsiasi altra informazione rilevante trovata nel PDF che potrebbe essere utile per training/mapping"
  },
  "services": [
    {
      "driver": "Mobile|Fisso|Energia|...",
      "category": "...",
      "typology": "...",
      "productDescription": "...",
      "rawTextFromPdf": "Testo ESATTO dal PDF (es. 'Super Fibra 2,5 Giga & Netflix') per mapping",
      "price": 14.99,
      "duration": "24 mesi",
      "activationDate": "YYYY-MM-DD",
      "phoneNumber": "..." 
    }
  ],
  "confidence": 95,
  "extractionNotes": "..."
}

**REGOLE CRITICHE**:
1. **TIPO CLIENTE**: P.IVA presente → "business", altrimenti "consumer"
2. **BUSINESS**: Usa campi Supplier (vatNumber, taxCode, pecEmail, sdiCode, legalForm, code, contactPerson)
3. **CONSUMER**: Usa campi User (firstName, lastName, fiscalCode, email, mobilePhone, landlinePhone, birthDate)
4. **CONTATTO BUSINESS**: Se P.IVA, estrai SEMPRE contactPerson (referente aziendale)
5. **VALIDAZIONE**: fiscalCode 16 char, vatNumber 11 cifre, postalCode 5 cifre, province 2 char
6. **COMPLETEZZA**: confidence alta = più campi estratti correttamente
7. **CAMPI PRESUNTI**: Per ogni servizio, estrai in "rawTextFromPdf" la descrizione ESATTA dal PDF (es. "cosa: Super Fibra 2,5 Giga & Netflix" → "Super Fibra 2,5 Giga & Netflix") per facilitare il mapping prodotti WindTre
8. **TELEFONI**: Distingui cellulari (mobilePhone = +39 3xx) da fissi (landlinePhone = +39 0xx). Applica a cliente e contactPerson.
9. **ADDITIONAL INFO**: Estrai tutte le informazioni aggiuntive trovate nel PDF nel campo additionalInfo:
   - customerCode: codice cliente (se presente)
   - contractCode: codice contratto (se presente)
   - contractNumber: numero contratto
   - promotionCode, salesAgent, store, campaignName, otherRelevantData

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
        customerData: {
          ...analysisResult.customer || {},
          additionalInfo: analysisResult.additionalInfo || null // Save additional info with customer data
        },
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
        totalPdfs: sql`${aiPdcAnalysisSessions.totalPdfs} + 1`,
        processedPdfs: sql`${aiPdcAnalysisSessions.processedPdfs} + 1`,
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
 * Note: This endpoint is deprecated in favor of /sessions/:sessionId/upload
 * Kept for backward compatibility - redirects to the session-based upload
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
      return res.status(400).json({ error: "Session ID is required. Please use /sessions/:sessionId/upload endpoint instead." });
    }

    // Redirect to the newer session-based upload
    return res.status(400).json({ 
      error: "This endpoint is deprecated. Please use POST /api/pdc/sessions/:sessionId/upload instead.",
      hint: "Upload PDF to a session using the newer endpoint for better tracking and organization."
    });
  } catch (error) {
    console.error("Error in deprecated analyze endpoint:", error);
    res.status(500).json({ error: "Failed to process request" });
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
    const { entryId, correctedOutput, correctionNotes } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!entryId || !correctedOutput) {
      return res.status(400).json({ error: "Entry ID and corrected output are required" });
    }

    // Get current entry state via session join for tenant validation
    const [currentEntry] = await db
      .select({
        id: aiPdcTrainingDataset.id,
        sessionId: aiPdcTrainingDataset.sessionId,
        correctedJson: aiPdcTrainingDataset.correctedJson,
      })
      .from(aiPdcTrainingDataset)
      .innerJoin(aiPdcAnalysisSessions, eq(aiPdcTrainingDataset.sessionId, aiPdcAnalysisSessions.id))
      .where(
        and(
          eq(aiPdcTrainingDataset.id, entryId),
          eq(aiPdcAnalysisSessions.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!currentEntry) {
      return res.status(404).json({ error: "Training entry not found" });
    }

    // Update training entry with corrected data
    const [updatedEntry] = await db
      .update(aiPdcTrainingDataset)
      .set({
        correctedJson: correctedOutput,
        correctionNotes: correctionNotes || null,
        validatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(aiPdcTrainingDataset.id, entryId))
      .returning();

    res.json(updatedEntry);
  } catch (error) {
    console.error("Error reviewing training entry:", error);
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
      .orderBy(aiPdcTrainingDataset.createdAt);

    // Build export data using corrected output if available, otherwise AI output
    const exportData = trainingData.map((entry) => ({
      fileName: entry.pdfFileName,
      confidence: entry.aiConfidence,
      data: entry.correctedJson || entry.aiExtractedData,
      reviewed: entry.correctedJson !== null,
      correctionNotes: entry.correctionNotes,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));

    const exportPayload = {
      sessionId: session.id,
      sessionName: session.sessionName,
      tenantId: session.tenantId,
      totalPdfs: session.totalPdfs,
      processedPdfs: session.processedPdfs,
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
      .orderBy(aiPdcServiceMapping.createdAt);

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
      serviceTextExtracted,
      serviceDescription,
      driverId, 
      categoryId, 
      typologyId, 
      productId,
      mappingConfidence = 100,
      mappingMethod = 'manual'
    } = req.body;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!serviceTextExtracted) {
      return res.status(400).json({ error: "Service text extracted is required" });
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

    // Check if mapping already exists for this service text
    const [existingMapping] = await db
      .select()
      .from(aiPdcServiceMapping)
      .where(
        and(
          eq(aiPdcServiceMapping.extractedDataId, id),
          eq(aiPdcServiceMapping.serviceTextExtracted, serviceTextExtracted)
        )
      );

    let mapping;

    if (existingMapping) {
      // Update existing mapping
      [mapping] = await db
        .update(aiPdcServiceMapping)
        .set({
          serviceDescription,
          driverId,
          categoryId,
          typologyId,
          productId,
          mappingConfidence,
          mappingMethod,
          mappedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(aiPdcServiceMapping.id, existingMapping.id))
        .returning();
    } else {
      // Create new mapping
      [mapping] = await db
        .insert(aiPdcServiceMapping)
        .values({
          extractedDataId: id,
          serviceTextExtracted,
          serviceDescription,
          driverId,
          categoryId,
          typologyId,
          productId,
          mappingConfidence,
          mappingMethod,
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
    const finalDataTyped = finalData as { customer?: Record<string, unknown>; services?: Array<Record<string, unknown>> };
    const exportJson = {
      customer: finalDataTyped.customer || {},
      services: (finalDataTyped.services || []).map((service: Record<string, unknown>) => {
        const serviceText = String(service.rawTextFromPdf || service.productDescription || '');
        const mapping = serviceMappings.find(m => m.serviceTextExtracted === serviceText);
        return {
          ...service,
          windtreMapping: mapping ? {
            driverId: mapping.driverId,
            categoryId: mapping.categoryId,
            typologyId: mapping.typologyId,
            productId: mapping.productId,
            confidence: mapping.mappingConfidence,
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
