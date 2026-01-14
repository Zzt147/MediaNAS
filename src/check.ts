// src/check.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. 统计总数
    const count = await prisma.mediaFile.count();
    console.log(`📊 数据库里目前共有 ${count} 个文件`);

    // 2. 列出最近的 5 个文件
    const files = await prisma.mediaFile.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' }
    });

    console.log('📋 最近入库的 5 个文件：');
    files.forEach(f => {
        console.log(` - [${f.mimeType}] ${f.filename} (大小: ${f.size})`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());