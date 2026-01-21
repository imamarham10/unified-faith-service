"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) {
            throw new Error('DATABASE_URL is not set in environment variables. ' +
                'Please set DATABASE_URL in your .env file.');
        }
        if (databaseUrl.startsWith('prisma+')) {
            super({ accelerateUrl: databaseUrl });
        }
        else {
            const pool = new pg_1.Pool({
                connectionString: databaseUrl,
                ssl: {
                    rejectUnauthorized: false,
                },
            });
            const adapter = new adapter_pg_1.PrismaPg(pool);
            super({ adapter });
        }
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        const databaseUrl = process.env.DATABASE_URL;
        this.logger.log(`Connecting to database: ${databaseUrl?.substring(0, 50)}...`);
        try {
            await this.$connect();
            this.logger.log('Database connected successfully');
        }
        catch (error) {
            this.logger.warn('Failed to connect to database on startup. ' +
                'Connection will be attempted on first query. Error: ' + error.message);
        }
    }
    async onModuleDestroy() {
        try {
            await this.$disconnect();
            this.logger.log('Database disconnected');
        }
        catch (error) {
            this.logger.warn('Error disconnecting from database:', error.message);
        }
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map