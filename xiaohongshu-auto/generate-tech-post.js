const KimiClient = require('./src/ai/kimi-client');
const ImageGenerator = require('./src/image/image-generator');
const fs = require('fs-extra');
const path = require('path');

/**
 * 生成科技类小红书内容
 */
async function generateTechContent() {
  console.log('🚀 生成第一期科技类内容...\n');
  
  const ai = new KimiClient();
  const imageGen = new ImageGenerator();
  
  // 科技类主题数据
  const techData = {
    items: [
      {
        id: 1,
        title: '探索AI工具提升效率',
        description: '使用ChatGPT、Claude等AI助手处理日常任务',
        completed: true,
        time: Date.now(),
        type: 'todo'
      },
      {
        id: 2,
        title: '搭建个人知识管理系统',
        description: '用Notion/Obsidian建立第二大脑',
        completed: true,
        time: Date.now(),
        type: 'todo'
      },
      {
        id: 3,
        title: '学习Python自动化脚本',
        description: '让重复工作自动化处理',
        completed: false,
        time: Date.now(),
        type: 'todo'
      },
      {
        id: 4,
        title: '体验AR/VR新技术',
        description: 'Vision Pro和Meta Quest对比体验',
        completed: false,
        time: Date.now(),
        type: 'todo'
      },
      {
        id: 5,
        title: '阅读《未来简史》',
        description: '思考科技对人类的影响',
        completed: true,
        time: Date.now(),
        type: 'todo'
      }
    ],
    stats: {
      total: 5,
      completed: 3,
      pending: 2,
      efficiency: 60
    },
    theme: 'tech'
  };
  
  try {
    // 生成科技风文案
    console.log('🤖 正在生成科技类文案...');
    
    const prompt = `请为念念App创作一篇科技类小红书笔记。

【主题】科技生活家：用数字化工具重塑效率
【数据】今日5项科技相关任务，完成3项
【要点】
- AI工具提升效率
- 个人知识管理系统
- 自动化工作流
- 前沿科技体验

要求：
1. 标题要吸引人，带科技感
2. 内容干货满满，实用性强
3. 适合科技爱好者/数字游民
4. 结尾引导互动

输出JSON格式：
{
  "title": "标题（20字以内，吸引人）",
  "content": "正文（带emoji，分段清晰，干货）",
  "hashtags": ["标签1", "标签2", ...]
}`;

    const { default: axios } = await import('axios');
    const config = require('./config/config');
    
    const response = await axios.post(
      config.kimi.apiUrl,
      {
        model: config.kimi.model,
        messages: [
          {
            role: 'system',
            content: '你是一位科技博主，擅长分享数字化工具和效率提升技巧。你的文案风格专业但有温度，能让普通人也能理解科技的美好。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${config.kimi.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const result = JSON.parse(response.data.choices[0].message.content);
    
    console.log('\n✅ 文案生成成功！\n');
    console.log('========== 📱 第一期：科技类 ==========\n');
    console.log(`📌 标题：${result.title}\n`);
    console.log(`📝 正文：\n${result.content}\n`);
    console.log(`🏷️ 标签：${result.hashtags.join(' ')}\n`);
    console.log('========================================\n');
    
    // 生成科技风图片
    console.log('🎨 正在生成科技风配图...');
    
    const techHTML = buildTechCardHTML(techData, result.title);
    const outputDir = path.join(__dirname, 'screenshots');
    await fs.ensureDir(outputDir);
    
    const filename = `tech-post-1-${Date.now()}.png`;
    const outputPath = path.join(outputDir, filename);
    
    const nodeHtmlToImage = require('node-html-to-image');
    await nodeHtmlToImage({
      output: outputPath,
      html: techHTML,
      quality: 100,
      puppeteerArgs: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        defaultViewport: {
          width: 900,
          height: 1200
        }
      }
    });
    
    console.log(`✅ 配图生成成功！`);
    console.log(`📁 保存位置：${outputPath}\n`);
    
    // 保存完整内容到文件
    const contentFile = path.join(__dirname, 'content', `tech-post-1-${Date.now()}.txt`);
    await fs.ensureDir(path.dirname(contentFile));
    
    const fullContent = `${result.title}

${result.content}

${result.hashtags.join(' ')}

---
配图：${outputPath}
生成时间：${new Date().toLocaleString()}
`;
    
    fs.writeFileSync(contentFile, fullContent);
    console.log(`💾 内容已保存：${contentFile}\n`);
    
    // 输出发布建议
    console.log('💡 发布建议：\n');
    console.log('1. 最佳发布时间：工作日晚8-10点 或 周末下午');
    console.log('2. 首图建议：使用生成的配图');
    console.log('3. 可以补充2-3张实际使用念念的截图');
    console.log('4. 发布后30分钟内积极回复评论');
    console.log('5. 关注相关话题，提升曝光\n');
    
    return {
      title: result.title,
      content: result.content,
      hashtags: result.hashtags,
      imagePath: outputPath,
      fullText: `${result.title}\n\n${result.content}\n\n${result.hashtags.join(' ')}`
    };
    
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    throw error;
  }
}

/**
 * 构建科技风卡片HTML
 */
function buildTechCardHTML(data, title) {
  const { items } = data;
  const completedCount = items.filter(i => i.completed).length;
  
  const tasksHTML = items.map(item => `
    <div class="task-item ${item.completed ? 'completed' : ''}">
      <span class="task-icon">${item.completed ? '✓' : '○'}</span>
      <span class="task-text">${escapeHtml(item.title)}</span>
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
      width: 900px;
      height: 1200px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
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
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .tag {
      display: inline-block;
      background: linear-gradient(135deg, #00d2ff, #3a7bd5);
      color: white;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 15px;
    }
    
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    
    .app-name {
      font-size: 36px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 8px;
    }
    
    .subtitle {
      font-size: 20px;
      color: #666;
    }
    
    .stats {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin: 30px 0;
      padding: 25px 0;
      border-top: 2px solid #f0f0f0;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .stat-item {
      text-align: center;
    }
    
    .stat-value {
      font-size: 48px;
      font-weight: 700;
      background: linear-gradient(135deg, #00d2ff, #3a7bd5);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    
    .stat-label {
      font-size: 16px;
      color: #999;
      margin-top: 5px;
    }
    
    .tasks {
      margin: 30px 0;
    }
    
    .task-item {
      display: flex;
      align-items: center;
      padding: 18px 0;
      font-size: 22px;
      border-bottom: 1px dashed #e0e0e0;
    }
    
    .task-item:last-child {
      border-bottom: none;
    }
    
    .task-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid #ddd;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 14px;
      flex-shrink: 0;
    }
    
    .task-item.completed .task-icon {
      background: linear-gradient(135deg, #00d2ff, #3a7bd5);
      border-color: transparent;
      color: white;
    }
    
    .task-item.completed .task-text {
      text-decoration: line-through;
      color: #999;
    }
    
    .task-text {
      color: #333;
    }
    
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
    }
    
    .tech-icons {
      font-size: 32px;
      margin-bottom: 10px;
    }
    
    .footer-text {
      font-size: 18px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="tag">🔥 第一期</div>
      <div class="logo">🦋</div>
      <div class="app-name">念念 · 科技生活</div>
      <div class="subtitle">用数字化工具重塑效率</div>
    </div>
    
    <div class="stats">
      <div class="stat-item">
        <div class="stat-value">${items.length}</div>
        <div class="stat-label">今日探索</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${completedCount}</div>
        <div class="stat-label">已完成</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${Math.round((completedCount/items.length)*100)}%</div>
        <div class="stat-label">效率指数</div>
      </div>
    </div>
    
    <div class="tasks">
      ${tasksHTML}
    </div>
    
    <div class="footer">
      <div class="tech-icons">💻 🤖 ⚡ 🚀</div>
      <div class="footer-text">科技让生活更美好</div>
    </div>
  </div>
</body>
</html>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 执行生成
generateTechContent().catch(console.error);
