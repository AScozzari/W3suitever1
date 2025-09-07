import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { registerBrandRoutes } from './core/routes.js';
import { setupBrandDatabase } from './core/database.js';

const app = express();
const PORT = process.env.BRAND_API_PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development
}));

app.use(cors({
  origin: ['http://localhost:5000', 'http://localhost:5001'], // W3 Suite + Brand Interface
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Session middleware for Brand admin
app.use(session({
  secret: process.env.BRAND_SESSION_SECRET || 'brand-session-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Brand Interface API',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  try {
    // Setup database connection (same database, Brand tenant context)
    await setupBrandDatabase();
    console.log('✅ Brand Database connection established');

    // Register API routes
    await registerBrandRoutes(app);
    console.log('✅ Brand API routes registered');

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log('🚀 Brand Interface API running on port', PORT);
      console.log('🔗 Available at: http://localhost:' + PORT);
      console.log('🎯 Workspace endpoints:');
      console.log('   📢 Marketing: /api/brand/marketing/*');
      console.log('   💰 Sales: /api/brand/sales/*');
      console.log('   ⚙️  Operations: /api/brand/operations/*');
      console.log('   🛡️  Admin: /api/brand/admin/*');
    });

  } catch (error) {
    console.error('❌ Failed to start Brand API server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 Brand API server shutting down gracefully...');
  process.exit(0);
});

startServer();