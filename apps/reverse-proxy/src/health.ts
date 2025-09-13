/**
 * W3 Suite Enterprise Reverse Proxy - Health Check System
 * Monitors upstream services and provides health status
 */

import { Request, Response } from 'express';
import http from 'http';
import { config } from './config.js';
import logger from './logger.js';

export interface ServiceHealth {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime?: number;
  lastCheck: Date;
  error?: string;
}

export class HealthChecker {
  private healthStatus: Map<string, ServiceHealth> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeServices();
    this.startHealthChecks();
  }

  private initializeServices(): void {
    const services = [
      { name: 'w3-frontend', url: `http://${config.upstream.w3Frontend.host}:${config.upstream.w3Frontend.port}` },
      { name: 'w3-backend', url: `http://${config.upstream.w3Backend.host}:${config.upstream.w3Backend.port}/health` },
      { name: 'brand-frontend', url: `http://${config.upstream.brandFrontend.host}:${config.upstream.brandFrontend.port}` },
      { name: 'brand-backend', url: `http://${config.upstream.brandBackend.host}:${config.upstream.brandBackend.port}/health` },
    ];

    services.forEach(service => {
      this.healthStatus.set(service.name, {
        name: service.name,
        url: service.url,
        status: 'unknown',
        lastCheck: new Date(),
      });
    });
  }

  private startHealthChecks(): void {
    this.healthStatus.forEach((service, name) => {
      // Initial check
      this.checkService(name);
      
      // Schedule periodic checks
      const interval = setInterval(() => {
        this.checkService(name);
      }, config.healthCheck.interval);
      
      this.intervals.set(name, interval);
    });
  }

  private async checkService(serviceName: string): Promise<void> {
    const service = this.healthStatus.get(serviceName);
    if (!service) return;

    const startTime = Date.now();
    
    try {
      const url = new URL(service.url);
      const response = await this.makeHealthRequest(url);
      const responseTime = Date.now() - startTime;

      this.healthStatus.set(serviceName, {
        ...service,
        status: response.statusCode === 200 ? 'healthy' : 'unhealthy',
        responseTime,
        lastCheck: new Date(),
        error: response.statusCode !== 200 ? `HTTP ${response.statusCode}` : undefined,
      });

      if (response.statusCode !== 200) {
        logger.warn(`Health check failed for ${serviceName}`, {
          url: service.url,
          statusCode: response.statusCode,
          responseTime,
        });
      }
    } catch (error) {
      this.healthStatus.set(serviceName, {
        ...service,
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error(`Health check error for ${serviceName}`, {
        url: service.url,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  private makeHealthRequest(url: URL): Promise<{ statusCode: number }> {
    return new Promise((resolve, reject) => {
      const request = http.request({
        hostname: url.hostname,
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'GET',
        timeout: config.healthCheck.timeout,
      }, (response) => {
        resolve({ statusCode: response.statusCode || 0 });
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
      
      request.end();
    });
  }

  public getHealthStatus(): ServiceHealth[] {
    return Array.from(this.healthStatus.values());
  }

  public getOverallHealth(): { status: 'healthy' | 'degraded' | 'unhealthy'; services: ServiceHealth[] } {
    const services = this.getHealthStatus();
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const totalCount = services.length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount) {
      status = 'healthy';
    } else if (healthyCount > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, services };
  }

  public handleHealthEndpoint(req: Request, res: Response): void {
    const health = this.getOverallHealth();
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 206 : 503;

    res.status(statusCode).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: health.services,
      proxy: {
        status: 'healthy',
        port: config.port,
        environment: config.environment,
      },
    });
  }

  public destroy(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
  }
}