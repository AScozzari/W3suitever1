# W3 Suite Enterprise Reverse Proxy

Production-ready reverse proxy for the W3 Suite enterprise architecture, providing unified access to multiple microservices through intelligent routing.

## Architecture Overview

The reverse proxy unifies access to 4 separate services on port 5000:

```
┌─────────────────────────────────────────────────────────────┐
│                  Reverse Proxy (Port 5000)                 │
├─────────────────────────────────────────────────────────────┤
│  Routing Rules:                                             │
│  • /*                    → W3 Suite Frontend (3000)        │
│  • /api/*                → W3 Suite Backend (3004)         │
│  • /brandinterface/*     → Brand Interface Frontend (3001) │
│  • /brand-api/*          → Brand Interface Backend (3002)  │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 🔒 Enterprise Security
- **Helmet.js**: Security headers and CSRF protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: DDoS protection with configurable limits
- **Request Validation**: Input sanitization and validation

### 🚀 Performance & Reliability
- **Compression**: Gzip compression for responses
- **Connection Pooling**: Efficient upstream connections
- **Health Monitoring**: Real-time service health checks
- **Graceful Shutdown**: Clean process termination

### 📊 Monitoring & Logging
- **Winston Logging**: Structured logging with multiple transports
- **Request Tracing**: Unique request IDs for debugging
- **Performance Metrics**: Response time and throughput monitoring
- **Health Endpoints**: `/health` and `/health/detailed`

### 🌍 Environment Aware
- **Development Mode**: Relaxed security, detailed logging
- **Production Mode**: Enhanced security, optimized performance
- **Configuration**: Environment variables for all settings

## Quick Start

### Development Mode
```bash
# Start the reverse proxy in development mode
npm run reverse-proxy

# Or use the startup script
./start-reverse-proxy.sh
```

### Production Mode
```bash
# Build the proxy
npm run reverse-proxy:build

# Start in production mode
NODE_ENV=production npm run reverse-proxy:start
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PROXY_PORT` | `5000` | Proxy server port |
| `W3_FRONTEND_HOST` | `localhost` | W3 Suite frontend host |
| `W3_FRONTEND_PORT` | `3000` | W3 Suite frontend port |
| `W3_BACKEND_HOST` | `localhost` | W3 Suite backend host |
| `W3_BACKEND_PORT` | `3004` | W3 Suite backend port |
| `BRAND_FRONTEND_HOST` | `localhost` | Brand Interface frontend host |
| `BRAND_FRONTEND_PORT` | `3001` | Brand Interface frontend port |
| `BRAND_BACKEND_HOST` | `localhost` | Brand Interface backend host |
| `BRAND_BACKEND_PORT` | `3002` | Brand Interface backend port |
| `CORS_ORIGINS` | (see config) | Allowed CORS origins (comma-separated) |
| `LOG_LEVEL` | `info` | Logging level |

### Security Configuration

```bash
# Enable/disable security features
ENABLE_HELMET=true
ENABLE_RATE_LIMIT=true
ENABLE_COMPRESSION=true

# CORS configuration
CORS_ORIGINS="https://w3suite.com,https://app.w3suite.com"

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX=100           # requests per window
```

## Health Monitoring

### Health Check Endpoints

- **`GET /health`**: Basic health status
- **`GET /health/detailed`**: Comprehensive health information

### Health Response Example

```json
{
  "status": "healthy",
  "timestamp": "2025-09-13T10:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "services": [
    {
      "name": "w3-frontend",
      "status": "healthy",
      "responseTime": 45,
      "lastCheck": "2025-09-13T10:00:00.000Z"
    }
  ],
  "proxy": {
    "status": "healthy",
    "port": 5000,
    "environment": "development"
  }
}
```

## Routing Rules

The proxy implements intelligent routing with the following priority order:

1. **Health Endpoints** (`/health`, `/health/*`)
   - Internal proxy health monitoring
   - Highest priority to ensure monitoring always works

2. **Brand Interface API** (`/brand-api/*`)
   - Routes to Brand Interface Backend (port 3002)
   - Handles brand-specific API operations

3. **W3 Suite API** (`/api/*`)
   - Routes to W3 Suite Backend (port 3004)
   - Handles main application API operations

4. **Brand Interface Frontend** (`/brandinterface/*`)
   - Routes to Brand Interface Frontend (port 3001)
   - Serves brand management interface

5. **W3 Suite Frontend** (`/*` - catch-all)
   - Routes to W3 Suite Frontend (port 3000)
   - Serves main application interface
   - Lowest priority to catch all unmatched routes

## Logging

### Log Levels
- `error`: System errors and failures
- `warn`: Warning conditions
- `info`: General information
- `debug`: Detailed debugging information

### Log Format (Development)
```
10:30:15 [info] [w3suite-proxy] Proxy server started on port 5000
10:30:16 [debug] [http] GET /api/users → 200 (45ms)
```

### Log Format (Production)
```json
{
  "timestamp": "2025-09-13T10:30:15.123Z",
  "level": "info",
  "message": "Proxy server started on port 5000",
  "service": "w3suite-proxy"
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Internal Server Error",
  "message": "Upstream service unavailable",
  "requestId": "req_1694601015123_abc123",
  "timestamp": "2025-09-13T10:30:15.123Z"
}
```

### Common HTTP Status Codes
- `200`: Success
- `206`: Partial Content (degraded health)
- `400`: Bad Request
- `401`: Unauthorized
- `404`: Not Found
- `429`: Too Many Requests (rate limited)
- `502`: Bad Gateway (upstream unavailable)
- `503`: Service Unavailable (unhealthy)

## Development

### Project Structure
```
apps/reverse-proxy/
├── src/
│   ├── index.ts        # Main server application
│   ├── config.ts       # Environment configuration
│   ├── logger.ts       # Winston logging setup
│   ├── health.ts       # Health monitoring system
│   ├── middleware.ts   # Express middleware stack
│   └── routes.ts       # Proxy routing configuration
├── package.json        # Dependencies and scripts
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

### Dependencies
- **Express**: Web server framework
- **http-proxy-middleware**: HTTP proxy functionality
- **Winston**: Logging framework
- **Helmet**: Security middleware
- **CORS**: Cross-origin resource sharing
- **Compression**: Response compression
- **Morgan**: HTTP request logging

## Production Deployment

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY apps/reverse-proxy/ .
RUN npm install && npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### PM2 Configuration
```json
{
  "apps": [{
    "name": "w3suite-proxy",
    "script": "dist/index.js",
    "instances": "max",
    "exec_mode": "cluster",
    "env": {
      "NODE_ENV": "production",
      "PROXY_PORT": 5000
    }
  }]
}
```

## Troubleshooting

### Common Issues

1. **Upstream Service Unavailable (502)**
   - Check if target services are running
   - Verify port configurations
   - Check firewall settings

2. **Rate Limited (429)**
   - Adjust rate limiting configuration
   - Check for DDoS attacks
   - Monitor request patterns

3. **CORS Errors**
   - Verify CORS_ORIGINS configuration
   - Check request headers
   - Enable development mode for testing

### Debug Mode
```bash
LOG_LEVEL=debug npm run reverse-proxy
```

## Support

For issues and feature requests, please contact the W3 Suite development team.