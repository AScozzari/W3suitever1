import { Request, Response, NextFunction } from 'express';

/**
 * Raw Body Capture Middleware
 * 
 * Captures the raw request body as a Buffer BEFORE JSON parsing
 * Required for webhook signature validation (Stripe, Twilio, GitHub)
 * 
 * MUST be applied BEFORE express.json() middleware
 * 
 * Usage:
 * app.use('/webhooks', rawBodyMiddleware);
 * app.use(express.json());
 */

declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

export const rawBodyMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });

  req.on('error', (error) => {
    console.error('Error capturing raw body:', error);
    next(error);
  });
};
