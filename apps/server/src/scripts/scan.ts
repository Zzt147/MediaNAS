// src/scan.ts
import { PrismaClient } from '@prisma/client';
import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';

// 1. 初始化数据库客户端
const prisma = new PrismaClient();

// 2. 配置你要扫描的盘符 (根据你的实际情况修改)
// 注意：Windows 路径建议用正斜杠 / 或者双反斜杠 \\
const watchPaths = [
    'F:/', 
    'G:/', 
    'H:/', 
    'I:/', 
    'J:/', 
    'K:/'
];

// 只扫描这些后缀的文件 (过滤掉系统文件、文档等)
const allowedExtensions = new Set([
    // 图片格式
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.bmp', '.tiff', '.tif', '.heic', '.heif',
    '.avif', '.svg', '.ico', '.raw',
    
    // 视频格式
    '.mp4', '.mkv', '.avi', '.mov', '.webm',
    '.wmv', '.flv', '.m4v', '.mpg', '.mpeg',
    '.3gp', '.ogv', '.rm', '.rmvb', '.vob',
    '.ts', '.m2ts', '.divx', '.xvid',
]);

console.log('🚀 开始启动扫描服务...');
console.log(`📡 监听路径: ${watchPaths.join(', ')}`);

// 3. 配置 Chokidar 监听器
const watcher = chokidar.watch(watchPaths, {
    ignored: /(^|[\/\\])\../, // 忽略隐藏文件 (以点开头的文件)
    persistent: true,         // 持续监听 (守护进程模式)
    depth: 99,                // 递归深度
    awaitWriteFinish: {       // 等待文件写入完成才触发 (防止读取正在拷贝的文件)
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

// 4. 处理“发现文件”事件
watcher.on('add', async (filePath) => {
    // 获取后缀名 (转小写)
    const ext = path.extname(filePath).toLowerCase();
    
    // 如果不是我们关注的格式，直接跳过
    if (!allowedExtensions.has(ext)) return;

    try {
        const stats = fs.statSync(filePath);
        const filename = path.basename(filePath);
        
        // 简单判断类型
        const mimeType = ext.startsWith('.m') || ext === '.avi' ? 'video' : 'image';

        // 写入数据库 (使用 upsert: 如果存在就更新，不存在就创建)
        await prisma.mediaFile.upsert({
            where: { path: filePath },
            update: {
                size: stats.size,
                updatedAt: new Date()
            },
            create: {
                path: filePath,
                filename: filename,
                size: stats.size,
                mimeType: mimeType
            }
        });

        console.log(`[新增/更新] ${filename}`);
    } catch (err) {
        console.error(`❌ 处理失败: ${filePath}`, err);
    }
});

// 监听错误
watcher.on('error', error => console.error(`Watcher error: ${error}`));

// 监听准备完成 (扫描完初始文件)
watcher.on('ready', () => {
    console.log('✅ 初始扫描完成，正在后台静默监听文件变动...');
});