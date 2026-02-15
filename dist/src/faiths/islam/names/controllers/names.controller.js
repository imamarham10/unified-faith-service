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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamesController = void 0;
const common_1 = require("@nestjs/common");
const names_service_1 = require("../services/names.service");
let NamesController = class NamesController {
    constructor(namesService) {
        this.namesService = namesService;
    }
    async getAllNames() {
        return this.namesService.getAllNames();
    }
    async getName(id) {
        return this.namesService.getName(parseInt(id));
    }
    async addFavorite(favoriteDto) {
        return this.namesService.addFavorite(favoriteDto);
    }
    async getDailyName() {
        return this.namesService.getDailyName();
    }
};
exports.NamesController = NamesController;
__decorate([
    (0, common_1.Get)('allah'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "getAllNames", null);
__decorate([
    (0, common_1.Get)('allah/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "getName", null);
__decorate([
    (0, common_1.Post)('favorites'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "addFavorite", null);
__decorate([
    (0, common_1.Get)('daily'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], NamesController.prototype, "getDailyName", null);
exports.NamesController = NamesController = __decorate([
    (0, common_1.Controller)('api/v1/islam/names'),
    __metadata("design:paramtypes", [names_service_1.NamesService])
], NamesController);
//# sourceMappingURL=names.controller.js.map