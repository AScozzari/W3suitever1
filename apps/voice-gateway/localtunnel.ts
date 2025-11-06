/**
 * LocalTunnel TCP Tunnel for ESL Port 8081
 * 
 * Exposes the ESL server on port 8081 to the public internet via localtunnel.
 * This allows FreeSWITCH to connect from external networks.
 * 
 * NO REGISTRATION REQUIRED - Free and instant!
 */

import localtunnel from 'localtunnel';
import logger from './src/logger';

const ESL_PORT = parseInt(process.env.ESL_PORT || '8081');

async function startLocalTunnel() {
  try {
    logger.info('🚇 Starting LocalTunnel for ESL server...');
    logger.info(`📍 Local ESL port: ${ESL_PORT}`);
    logger.info('⏳ Connecting to localtunnel.me (no registration needed)...');

    // Start LocalTunnel
    const tunnel = await localtunnel({ port: ESL_PORT });

    const publicUrl = tunnel.url.replace('https://', ''); // Remove https:// prefix
    const publicHost = publicUrl;
    
    logger.info('=====================================');
    logger.info('🎉 LocalTunnel ACTIVE!');
    logger.info('=====================================');
    logger.info(`📡 Public URL: ${tunnel.url}`);
    logger.info(`🔌 Forwarding to: localhost:${ESL_PORT}`);
    logger.info('=====================================');
    logger.info('');
    logger.info('📋 CONFIGURE EDGVOIP DIALPLAN:');
    logger.info('');
    logger.info('  <action application="socket"');
    logger.info(`         data="${publicHost} ${ESL_PORT} async full"/>`);
    logger.info('');
    logger.info('⚠️  NOTE: LocalTunnel uses HTTPS proxy');
    logger.info('   FreeSWITCH needs to connect via HTTP, so use:');
    logger.info(`   Host: ${publicHost}`);
    logger.info(`   Port: ${ESL_PORT}`);
    logger.info('');
    logger.info('=====================================');
    logger.info('⚡ Tunnel will remain active until process stops');
    logger.info('=====================================');

    // Handle tunnel close
    tunnel.on('close', () => {
      logger.warn('⚠️  LocalTunnel closed - reconnecting...');
      setTimeout(() => startLocalTunnel(), 1000); // Auto-reconnect
    });

    // Handle errors
    tunnel.on('error', (err) => {
      logger.error('❌ LocalTunnel error', { error: err.message });
    });

    // Keep process alive
    process.on('SIGINT', () => {
      logger.info('🛑 Shutting down LocalTunnel...');
      tunnel.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('🛑 Shutting down LocalTunnel...');
      tunnel.close();
      process.exit(0);
    });

  } catch (error: any) {
    logger.error('❌ Failed to start LocalTunnel', {
      error: error.message,
      stack: error.stack
    });
    
    // Retry after delay
    logger.info('🔄 Retrying in 5 seconds...');
    setTimeout(() => startLocalTunnel(), 5000);
  }
}

// Start tunnel
if (require.main === module) {
  startLocalTunnel();
}

export { startLocalTunnel };
