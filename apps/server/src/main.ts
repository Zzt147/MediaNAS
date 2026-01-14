import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as os from 'os';

async function bootstrap() {
  // === 1. BigInt 补丁 (至关重要) ===
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };

  const app = await NestFactory.create(AppModule);

  // === 2. 跨域 ===
  app.enableCors();

  const PORT = 3000;
  await app.listen(PORT);

  // === 3. 获取 IP 显示启动信息 (保留你的原味功能) ===
  const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) return iface.address;
      }
    }
    return 'localhost';
  };

  console.log(`🚀 Server running on http://${getLocalIp()}:${PORT}`);
}
bootstrap();