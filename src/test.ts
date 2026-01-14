import fs from 'fs'; // 引入文件系统模块
import sharp from 'sharp'; // 引入图片处理模块

// 使用一下 fs，警告就会消失
const isProjectExists = fs.existsSync('./package.json');

console.log('------------------------------------------------');
console.log('1. Node.js 环境检测:', process.version);
console.log('2. 文件系统检测:', isProjectExists ? '✅ 正常' : '❌ 异常');

try {
    // 尝试打印 sharp 版本
    console.log('3. Sharp 图片引擎:', sharp.versions.vips ? `✅ 正常 (基于 libvips ${sharp.versions.vips})` : '❌ 异常');
} catch (e) {
    console.error('❌ Sharp 加载失败:', e);
}
console.log('------------------------------------------------');