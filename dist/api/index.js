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
        app.enableCors({ origin: '*' });
        await app.init();
        cachedServer = expressApp;
    }
    return cachedServer;
}
async function handler(req, res) {
    const server = await bootstrapServer();
    return server(req, res);
}
//# sourceMappingURL=index.js.map