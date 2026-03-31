"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const swagger_1 = require("@nestjs/swagger");
const common_2 = require("@nestjs/common");
const uuid_1 = require("uuid");
const app_module_1 = require("./app.module");
const global_exception_filter_1 = require("./common/filters/global-exception.filter");
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
function validateEnv() {
    const missing = requiredEnvVars.filter((v) => !process.env[v]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
async function bootstrap() {
    validateEnv();
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new global_exception_filter_1.GlobalExceptionFilter());
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    });
    app.enableVersioning({
        type: common_2.VersioningType.URI,
        defaultVersion: '1',
    });
    app.use((req, _res, next) => {
        req.headers['x-request-id'] = req.headers['x-request-id'] || (0, uuid_1.v4)();
        next();
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('E-commerce API')
        .setDescription('API for the e-commerce platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    app.enableShutdownHooks();
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}`);
    logger.log(`Swagger docs: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map