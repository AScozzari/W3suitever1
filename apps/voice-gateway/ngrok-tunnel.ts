/**
 * ngrok TCP Tunnel for ESL Port 8081
 * 
 * Exposes the ESL server on port 8081 to the public internet via ngrok tunnel.
 * This allows FreeSWITCH to connect from external networks.
 */

import ngrok from '@ngrok/ngrok';
import logger from './src/logger';

const ESL_PORT = parseInt(process.env.ESL_PORT || '8081');
const NGROK_AUTHTOKEN = process.env.NGROK_AUTHTOKEN || ''; // Optional for free tier

async function startNgrokTunnel() {
  try {
    logger.info('🚇 Starting ngrok TCP tunnel for ESL server...');
    logger.info(`📍 Local ESL port: ${ESL_PORT}`);

    // Configure ngrok (authtoken optional for free tier)
    if (NGROK_AUTHTOKEN) {
      logger.info('🔐 Using ngrok authtoken from environment');
    } else {
      logger.warn('⚠️  No NGROK_AUTHTOKEN set - using free tier (may have limits)');
    }

    // Start TCP tunnel
    const listener = await ngrok.forward({
      addr: ESL_PORT,
      proto: 'tcp',
      authtoken: NGROK_AUTHTOKEN || undefined,
    });

    const publicUrl = listener.url();
    
    logger.info('=====================================');
    logger.info('🎉 ngrok TCP Tunnel ACTIVE!');
    logger.info('=====================================');
    logger.info(`📡 Public URL: ${publicUrl}`);
    logger.info(`🔌 Forwarding to: localhost:${ESL_PORT}`);
    logger.info('=====================================');
    logger.info('');
    logger.info('📋 CONFIGURE EDGVOIP DIALPLAN:');
    logger.info('');
    logger.info('  <action application="socket"');
    logger.info(`         data="${publicUrl?.replace('tcp://', '')} async full"/>`);
    logger.info('');
    logger.info('=====================================');
    logger.info('⚡ Tunnel will remain active until process stops');
    logger.info('=====================================');

    // Keep process alive
    process.on('SIGINT', async () => {
      logger.info('🛑 Shutting down ngrok tunnel...');
      await listener.close();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('❌ Failed to start ngrok tunnel', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Start tunnel
startNgrokTunnel();
