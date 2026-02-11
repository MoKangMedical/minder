const axios = require('axios');
const config = require('../../config/config');

/**
 * Kimi AI 客户端
 * 用于生成小红书文案
 */
class KimiClient {
  constructor() {
    this.apiKey = config.kimi.apiKey;
    this.apiUrl = config.kimi.apiUrl;
    this.model = config.kimi.model;
  }
  
  /**
   * 生成小红书文案
   * @param {Object} minderData - 念念数据
   * @param {string} style - 文案风格
   * @returns {Promise<Object>} 生成的内容
   */
  async generatePost(minderData, style = '文艺清新') {
    const prompt = this.buildPrompt(minderData, style);
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `你是一位专业的小红书内容创作者，擅长创作${style}风格的笔记。
你的文案特点：
1. 开头吸引人，有钩子
2. 内容真实有共鸣
3. 适当使用emoji
4. 结尾有互动引导
5. 自然融入话题标签

请根据提供的数据创作一篇小红书笔记，输出JSON格式：
{
  "title": "标题（20字以内，吸引人）",
  "content": "正文（包含emoji，分段清晰）",
  "hashtags": ["标签1", "标签2", ...]
}`
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
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const result = JSON.parse(response.data.choices[0].message.content);
      return {
        title: result.title,
        content: result.content,
        hashtags: result.hashtags,
        fullContent: `${result.title}\n\n${result.content}\n\n${result.hashtags.join(' ')}`
      };
    } catch (error) {
      console.error('AI生成失败:', error.message);
      // 返回默认内容
      return this.getDefaultContent(minderData);
    }
  }
  
  /**
   * 构建提示词
   */
  buildPrompt(minderData, style) {
    const { items, stats } = minderData;
    
    // 构建今日数据摘要
    const todayItems = items.filter(item => {
      const itemDate = new Date(item.time);
      const today = new Date();
      return itemDate.toDateString() === today.toDateString();
    });
    
    const completedCount = todayItems.filter(i => i.completed).length;
    const pendingCount = todayItems.filter(i => !i.completed).length;
    
    // 选择一些代表性任务
    const sampleTasks = todayItems
      .slice(0, 5)
      .map(item => `- ${item.title}${item.completed ? ' ✓' : ''}`)
      .join('\n');
    
    return `请根据以下今日数据，创作一篇小红书笔记：

【今日数据】
- 总任务数: ${todayItems.length}
- 已完成: ${completedCount}
- 待处理: ${pendingCount}
- 效率指数: ${stats.efficiency || 85}%

【今日任务】
${sampleTasks || '今天是一个悠闲的日子～'}

【风格要求】
${style}

【产品信息】
这是来自"念念"App的记录，一个帮你记住生活中重要事项的温柔助手。

请创作吸引人的标题和内容，让读者感受到记录生活的美好。`;
  }
  
  /**
   * 默认内容（AI失败时使用）
   */
  getDefaultContent(minderData) {
    const { items } = minderData;
    const todayItems = items.filter(item => {
      const itemDate = new Date(item.time);
      const today = new Date();
      return itemDate.toDateString() === today.toDateString();
    });
    
    const completedCount = todayItems.filter(i => i.completed).length;
    
    return {
      title: completedCount > 0 
        ? `✨ 今天完成了${completedCount}件事，太棒啦！`
        : '🦋 用念念记录美好的一天',
      content: `今天用念念记录了${todayItems.length}件事

${todayItems.slice(0, 3).map(i => `• ${i.title}`).join('\n')}

每一个小目标的达成，都是对自己的一次肯定 💪

生活虽然忙碌，但也要记得给自己一点温柔～

你们今天完成了什么小目标呢？评论区告诉我吧 👇`,
      hashtags: ['#念念', '#效率工具', '#生活记录', '#自律'],
      fullContent: ''
    };
  }
  
  /**
   * 生成图片配文
   */
  async generateImageCaption(minderData) {
    const prompt = `请为一张日程规划App的截图写一句配文，要求：
1. 简短有力，15字以内
2. 有共鸣感
3. 适合作为图片配文

数据：今日${minderData.items.length}项任务，完成${minderData.items.filter(i => i.completed).length}项`;
    
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            { role: 'system', content: '你是一个文案高手，擅长写简短有力的配文' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      return '记录生活，从念念开始 🦋';
    }
  }
}

module.exports = KimiClient;
