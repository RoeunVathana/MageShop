"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
const laravel_compatibility_proxy_1 = require("./proxy/laravel-compatibility.proxy");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        bodyParser: false,
    });
    const config = app.get(config_1.ConfigService);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    const proxy = app.get(laravel_compatibility_proxy_1.LaravelCompatibilityProxy);
    app.use(proxy.middleware());
    const port = Number(config.get('PORT', '8080'));
    await app.listen(port, '0.0.0.0');
}
void bootstrap();
//# sourceMappingURL=main.js.map