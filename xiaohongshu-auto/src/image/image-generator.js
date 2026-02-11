const nodeHtmlToImage = require('node-html-to-image');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config/config');

/**
 * 图片生成器
 * 生成小红书分享卡片
 */
class ImageGenerator {
  constructor() {
    this.outputDir = config.image.outputDir;
    this.width = config.image.width;
    this.height = config.image.height;
    this.backgrounds = config.image.backgrounds;
    
    // 确保输出目录存在
    fs.ensureDirSync(this.outputDir);
  }
  
  /**
   * 生成分享卡片
   * @param {Object} data - 念念数据
   * @param {string} caption - 配文
   * @returns {Promise<string>} 图片路径
   */
  async generateShareCard(data, caption = '') {
    const html = this.buildCardHTML(data, caption);
    const filename = `xhs-${Date.now()}.png`;
    const outputPath = path.join(this.outputDir, filename);
    
    try {
      await nodeHtmlToImage({
        output: outputPath,
        html: html,
        quality: 100,
        puppeteerArgs: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          defaultViewport: {
            width: this.width,
            height: this.height
          }
        }
      });
      
      console.log(`✅ 图片生成成功: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error('❌ 图片生成失败:', error);
      throw error;
    }
  }
  
  /**
   * 构建卡片HTML
   */
  buildCardHTML(data, caption) {
    const { items } = data;
    const todayItems = items.filter(item => {
      const itemDate = new Date(item.time);
      const today = new Date();
      return itemDate.toDateString() === today.toDateString();
    });
    
    const completedCount = todayItems.filter(i => i.completed).length;
    const pendingCount = todayItems.filter(i => !i.completed).length;
    const totalCount = todayItems.length;
    
    // 随机选择背景
    const bg = this.backgrounds[Math.floor(Math.random() * this.backgrounds.length)];
    
    // 格式化时间
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}月${now.getDate()}日`;
    const weekday = ['日', '一', '二', '三', '四', '五', '六'][now.getDay()];
    
    // 任务列表HTML
    const tasksHTML = todayItems.slice(0, 6).map(item => `
      <div class="task-item ${item.completed ? 'completed' : ''}">
        <span class="task-checkbox">${item.completed ? '✓' : '○'}</span>
        <span class="task-text">${this.escapeHtml(item.title)}</span>
      </div>
    `).join('');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif;
      width: ${this.width}px;
      height: ${this.height}px;
      background: ${bg};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
    }
    
    .card {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 30px;
      padding: 50px;
      width: 100%;
      max-width: 720px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .app-name {
      font-size: 32px;
      font-weight: 700;
      color: #333;
      margin-bottom: 8px;
    }
    
    .date {
      font-size: 24px;
      color: #666;
    }
    
    .stats {
      display: flex;
      justify-content: center;
      gap: 40px;
      margin: 30px 0;
      padding: 20px 0;
      border-top: 1px solid #eee;
      border-bottom: 1px solid #eee;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-value {
      font-size: 42px;
      font-weight: 700;
      color: #8EC5FC;
    }
    
    .stat-label {
      font-size: 18px;
      color: #999;
      margin-top: 5px;
    }
    
    .tasks {
      margin: 30px 0;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      padding: 15px 0;
      font-size: 22px;
      border-bottom: 1px dashed #eee;
    }
    
    .task-item:last-child {
      border-bottom: none;
    }
    
    .task-checkbox {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .task-item.completed .task-checkbox {
      background: #A8EDEA;
      border-color: #A8EDEA;
    }
    
    .task-item.completed .task-text {
      text-decoration: line-through;
      color: #999;
    }
    
    .task-text {
      color: #333;
    }
    
    .caption {
      text-align: center;
      font-size: 24px;
      color: #666;
      margin-top: 30px;
      font-style: italic;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      font-size: 18px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo">🦋</div>
      <div class="app-name">念念</div>
      <div class="date">${dateStr} 星期${weekday}</div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${totalCount}</div>
        <div class="stat-label">今日事项</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${completedCount}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${pendingCount}</div>
        <div class="stat-label">待办</div>
      </div>
    </div>
    
    <div class="tasks">
      ${tasksHTML || '<div style="text-align: center; color: #999; padding: 20px;">今天还没有记录哦～</div>'}
    </div>
    
    ${caption ? `<div class="caption">"${this.escapeHtml(caption)}"</div>` : ''}
    
    <div class="footer">一念既起，皆为序章</div>
  </div>
</body>
</html>
    `;
  }
  
  /**
   * HTML转义
   */
  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

module.exports = ImageGenerator;
