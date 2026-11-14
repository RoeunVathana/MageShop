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
var LaravelCompatibilityProxy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaravelCompatibilityProxy = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const httpProxy = require("http-proxy");
let LaravelCompatibilityProxy = LaravelCompatibilityProxy_1 = class LaravelCompatibilityProxy {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(LaravelCompatibilityProxy_1.name);
        this.proxy = httpProxy.createProxyServer({
            changeOrigin: true,
            xfwd: true,
            ignorePath: false,
            secure: true,
        });
        this.proxy.on('error', (error, _request, response) => {
            this.logger.error(`Laravel upstream proxy failed: ${error.message}`);
            const serverResponse = response;
            if (!serverResponse.headersSent) {
                serverResponse.writeHead(502, { 'content-type': 'application/json' });
            }
            serverResponse.end(JSON.stringify({
                status: 'error',
                message: 'The API service is temporarily unavailable.',
            }));
        });
    }
    middleware() {
        return (request, response, next) => {
            if (request.path === '/up') {
                next();
                return;
            }
            const origin = this.config.get('LARAVEL_API_ORIGIN', 'https://api.tyushop.blog');
            this.proxy.web(request, response, {
                target: origin,
                ignorePath: false,
            });
        };
    }
    onModuleDestroy() {
        this.proxy.close();
    }
};
exports.LaravelCompatibilityProxy = LaravelCompatibilityProxy;
exports.LaravelCompatibilityProxy = LaravelCompatibilityProxy = LaravelCompatibilityProxy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], LaravelCompatibilityProxy);
//# sourceMappingURL=laravel-compatibility.proxy.js.map