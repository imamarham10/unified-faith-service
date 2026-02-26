"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = handler;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const core_1 = require("@nestjs/core");
const app_module_1 = require("../src/app.module");
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const express_1 = require("express");
let cachedServer;
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,https://siraatt.vercel.app').split(',');
function setCorsHeaders(req, res) {
    const origin = req.headers?.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
}
async function bootstrapServer() {
    if (!cachedServer) {
        const expressApp = (0, express_1.default)();
        const app = await core_1.NestFactory.create(app_module_1.AppModule, new platform_express_1.ExpressAdapter(expressApp));
        app.useGlobalPipes(new common_1.ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: false,
            transformOptions: { enableImplicitConversion: true },
        }));
        app.enableCors({
            origin: allowedOrigins,
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true,
        });
        await app.init();
        cachedServer = expressApp;
    }
    return cachedServer;
}
async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        return res.status(204).end();
    }
    const server = await bootstrapServer();
    setCorsHeaders(req, res);
    return server(req, res);
}
//# sourceMappingURL=index.js.map