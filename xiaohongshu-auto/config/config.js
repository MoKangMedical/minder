const path = require('path');

module.exports = {
  // Kimi AI 配置
  kimi: {
    apiKey: process.env.KIMI_API_KEY || 'sk-JLr7p2LHV9sSnmE0eNZA3XCCHH0Ij76JZBp9rDbbcfJEIYZQ',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k'
  },
  
  // 小红书配置
  xiaohongshu: {
    // 账号信息（用于首次登录）
    username: process.env.XHS_USERNAME || '',
    password: process.env.XHS_PASSWORD || '',
    
    // Cookie 存储路径
    cookiePath: path.join(__dirname, '../cookies/xhs-cookies.json'),
    
    // 发布设置
    publish: {
      // 每天最多发布条数
      maxDailyPosts: 3,
      
      // 发布时间（小时）
      publishHours: [9, 12, 18],
      
      // 发布间隔（分钟，随机范围）
      minInterval: 30,
      maxInterval: 120
    }
  },
  
  // 念念数据来源
  minder: {
    // 数据文件路径
    dataPath: process.env.MINDER_DATA_PATH || '../data/minder-data.json',
    
    // API 端点（如果使用后端）
    apiUrl: process.env.MINDER_API_URL || ''
  },
  
  // 内容生成配置
  content: {
    // 小红书文案风格
    styles: [
      '文艺清新', '实用干货', '生活记录', '情感共鸣', '效率提升'
    ],
    
    // 话题标签
    hashtags: [
      '#念念', '#效率工具', '#时间管理', '#生活记录',
      '#日程规划', '#自律', '#宝藏app', '#打工人必备',
      '#学生党必备', '#生活美学', '#治愈系', '#极简生活'
    ],
    
    // 每篇笔记最少字数
    minLength: 100,
    
    // 每篇笔记最多字数
    maxLength: 1000
  },
  
  // 图片生成配置
  image: {
    // 输出目录
    outputDir: path.join(__dirname, '../screenshots'),
    
    // 卡片尺寸（小红书推荐 3:4）
    width: 900,
    height: 1200,
    
    // 背景色选项
    backgrounds: [
      'linear-gradient(135deg, #E0C3FC 0%, #8EC5FC 100%)',
      'linear-gradient(135deg, #FFD1FF 0%, #A8EDEA 100%)',
      'linear-gradient(135deg, #FED6E3 0%, #D299C2 100%)',
      'linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)'
    ]
  },
  
  // 日志配置
  log: {
    level: 'info',
    dir: path.join(__dirname, '../logs')
  }
};
