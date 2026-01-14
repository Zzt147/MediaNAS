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
// src/server.ts

// ... 前面的代码不变 ...

// 2. 获取缩略图 (修复版：去掉 fs 流，直接用 sharp 处理路径)
app.get('/api/thumbnail/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const file = await prisma.mediaFile.findUnique({ where: { id } });

    if (!file || !fs.existsSync(file.path)) {
      return res.status(404).send('Not found');
    }

    // 🔥 修复点：直接用 sharp 读取文件路径，然后直接 pipe 给 res
    // 不要再用 fs.createReadStream 了
    const pipeline = sharp(file.path)
      .resize(300, 300, { 
        fit: 'cover',    // 保持比例填充，裁掉多余的
        position: 'center' // 从中间裁切
      }) 
      .jpeg({ quality: 60 }); // 压缩质量

    // 设置响应头
    res.set('Content-Type', 'image/jpeg');

    // 发送数据 (并捕获管道中的错误，防止再次崩服)
    pipeline
      .on('error', (err) => {
        console.error(`[Thumbnail Error] ID:${id} - ${err.message}`);
        // 如果流还没发出去，发个 500；如果发了一半就算了
        if (!res.headersSent) res.status(500).send('Error generating thumbnail');
      })
      .pipe(res);

  } catch (error) {
    console.error("生成缩略图严重错误:", error);
    if (!res.headersSent) res.status(500).send("Thumbnail Error");
  }
});

// === 接口 C: 查看原图/播放视频 ===
// 访问地址: /api/view/123
// 获取文件列表 (支持分页: ?page=1)
// src/server.ts

// 1. 新增接口：获取指定相册(文件夹)内的所有图片
app.get('/api/album', async (req, res) => {
  try {
    const folderPath = req.query.folder as string;
    if (!folderPath) return res.status(400).json({ error: "需要 folder 参数" });

    const photos = await prisma.mediaFile.findMany({
      where: {
        folder: folderPath, // 匹配文件夹路径
        mimeType: 'image',  // 只找图片
      },
      orderBy: { id: 'desc' }
    });
    res.json(photos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "获取相册失败" });
  }
});

// 2. 新增接口：获取缩略图 (实时压缩)
app.get('/api/thumbnail/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const file = await prisma.mediaFile.findUnique({ where: { id } });

    if (!file || !fs.existsSync(file.path)) return res.status(404).send('Not found');

    // 使用 sharp 实时调整大小
    // resize(300): 把宽度压缩到 300px，高度自动按比例缩放，转为 jpeg 格式
    const transform = sharp(file.path)
      .resize(300) 
      .jpeg({ quality: 60 }); // 质量 60%，体积非常小

    // 管道流：读取文件 -> 压缩 -> 发送给前端
    res.set('Content-Type', 'image/jpeg');
    fs.createReadStream(file.path).pipe(transform).pipe(res);

  } catch (error) {
    console.error("生成缩略图失败:", error);
    res.status(500).send("Thumbnail Error");
  }
});

app.get('/api/files', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;

    // 1. 获取所有视频 (正常分页)
    const videos = await prisma.mediaFile.findMany({
      where: { mimeType: 'video' },
      orderBy: { id: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    // 2. 获取相册 (图片)：利用 distinct 这里的黑科技
    // 意思就是：在所有 mimeType='image' 的文件里，按 'folder' 分组，每组只取一个
    const albums = await prisma.mediaFile.findMany({
      where: { mimeType: 'image' },
      distinct: ['folder'], // 🔥 关键：按文件夹去重，实现“相册封面”效果
      orderBy: { id: 'desc' },
      take: pageSize,
      skip: (page - 1) * pageSize,
    });

    // 3. 混合两者并按 ID 排序 (模拟 Timeline)
    // 注意：这样分页在混合时可能不精准，但对于家庭 NAS 足够了
    const mixed = [...videos, ...albums].sort((a, b) => b.id - a.id);

    res.json(mixed);
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