// src/server.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import type { MediaFile } from '@prisma/client'; // 加个 type，明确只导入类型
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
// 如果需要处理视频缩略图，需要用到 fluent-ffmpeg，这里先预留接口
import ffmpeg from 'fluent-ffmpeg';
import { fileURLToPath } from 'url';
import os from 'os'; // 别忘了在最上面加这行
import cors from 'cors'; // 记得在顶部引入

// 手动定义 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

// --- 新增：允许前端跨域访问 ---
app.use(cors());
// ---------------------------

// 1. 定义缩略图的缓存目录 (生成的缩略图存这里，下次直接读，不重复生成)
const THUMB_CACHE_DIR = path.join(__dirname, '../cache_thumbs');
if (!fs.existsSync(THUMB_CACHE_DIR)) {
    fs.mkdirSync(THUMB_CACHE_DIR);
}

// --- 在这里添加 BigInt 补丁 ---
// 让 JSON.stringify 知道如何处理 BigInt (转成字符串)
(BigInt.prototype as any).toJSON = function () {
  return Number(this); // 或者 return this.toString(); 如果文件特别大建议用 toString
};
// -----------------------------

// === 接口 A: 获取文件列表 (分页模式) ===
// 手机端无限滚动时，会发请求：/api/files?page=1, /api/files?page=2 ...
app.get('/api/view/:id', async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = await prisma.mediaFile.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      // 没找到记录，返回 404
      res.status(404).send('File not found in DB');
      return; 
    }

    // --- 关键修改：检查文件是否存在以及防止发送空文件 ---
    res.sendFile(file.path, (err: any) => {
      if (err) {
        // 只有当错误不是 "RangeNotSatisfiable" 时才报错
        // 因为 416 错误通常是浏览器乱请求导致的，不需要我们太担心
        if (err.status !== 416) {
          console.error('发送文件出错:', file.path, err.message);
        }
        
        // 如果头部还没发出去，发个错误状态
        if (!res.headersSent) {
          res.status(err.status || 500).end();
        }
      }
    });
    // -------------------------------------------------

  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

// === 接口 B: 获取缩略图 (核心性能点) ===
// 访问地址: /api/thumb/123 (123 是文件 ID)
app.get('/api/thumb/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const file = await prisma.mediaFile.findUnique({ where: { id } });

        if (!file) return res.status(404).send('Not Found');

        // 1. 定义缓存文件路径 (比如 cache_thumbs/123.webp)
        const cachePath = path.join(THUMB_CACHE_DIR, `${id}.webp`);

        // 2. 如果缓存存在，直接返回 (极速响应)
        if (fs.existsSync(cachePath)) {
            return res.sendFile(cachePath);
        }

        // 3. 如果是图片，实时生成缩略图
        if (file.mimeType === 'image') {
            await sharp(file.path)
                .resize(300, 300, { fit: 'cover' }) // 压缩成 300x300 的正方形
                .webp({ quality: 80 })              // 转为 WebP 格式
                .toFile(cachePath);
            
            return res.sendFile(cachePath);
        } 
        
        // 4. 如果是视频，暂时返回一个默认图标 (视频截图比较慢，后续再优化)
        // 这里你可以找一张 default_video.png 放在项目里
        else if (file.mimeType === 'video') {
             // 暂时返回文字或 404，或者你可以随便找张图代替
             return res.status(404).send('Video thumb not ready');
        }

    } catch (err) {
        console.error(err);
        res.status(500).send('Thumbnail Error');
    }
});

// === 接口 C: 查看原图/播放视频 ===
// 访问地址: /api/view/123
// 获取文件列表 (支持分页: ?page=1)
app.get('/api/files', async (req, res) => {
  try {
    // 1. 获取页码，默认是第 1 页
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20; // 每次加载 20 个

    // 2. 查询数据库
    const files = await prisma.mediaFile.findMany({
      take: pageSize,              // 取多少个
      skip: (page - 1) * pageSize, // 跳过多少个
      orderBy: { id: 'desc' },     // 按 ID 倒序 (新扫描的在前面)
    });

    res.json(files);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "获取列表失败" });
  }
});

// 替换底部的启动代码
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // 跳过内部IP (127.0.0.1) 和 非IPv4 地址
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// 启动服务器
app.listen(PORT, () => {
  const ip = getLocalIp();
  console.log(`
  🚀 NAS 服务器已启动!
  -----------------------------------
  [电脑本机访问]: http://localhost:${PORT}/api/files
  [手机局域网访问]: http://${ip}:${PORT}/api/files
  -----------------------------------

  -----------------------------------
    1. 列表接口: http://localhost:${PORT}/api/files
    2. 缩略图:   http://localhost:${PORT}/api/thumb/1
    3. 看原图:   http://localhost:${PORT}/api/view/1
  -----------------------------------
  `);
});