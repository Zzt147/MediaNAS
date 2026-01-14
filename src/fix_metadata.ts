// src/fix_metadata.ts
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

const EXT_MAP = {
  image: new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.bmp', '.tiff', '.tif', '.heic', '.heif', '.raw'
  ]),
  video: new Set([
    '.mp4', '.mkv', '.avi', '.mov', '.webm',
    '.wmv', '.flv', '.m4v', '.ts', '.m2ts'
  ])
};

async function main() {
  console.log("🚀 开始全量修复元数据 (类型 + 相册归档)...");
  
  const allFiles = await prisma.mediaFile.findMany();
  let updatedCount = 0;

  for (const file of allFiles) {
    const ext = path.extname(file.path).toLowerCase();
    const folderPath = path.dirname(file.path); // 提取文件夹路径
    
    let newMimeType = 'unknown';

    if (EXT_MAP.image.has(ext)) newMimeType = 'image';
    else if (EXT_MAP.video.has(ext)) newMimeType = 'video';
    else continue;

    // 只要 mimeType 不对，或者 folder 字段是空的，就更新
    if (file.mimeType !== newMimeType || file.folder !== folderPath) {
      await prisma.mediaFile.update({
        where: { id: file.id },
        data: {
          mimeType: newMimeType,
          folder: folderPath // ✅ 填充文件夹字段
        }
      });
      updatedCount++;
      if (updatedCount % 100 === 0) process.stdout.write(`.`);
    }
  }

  console.log(`\n✅ 修复完成！更新了 ${updatedCount} 个文件。`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());