const cron = require('node-cron');
const fs = require('fs-extra');
const path = require('path');

const config = require('../config/config');
const MinderClient = require('./data/minder-client');
const KimiClient = require('./ai/kimi-client');
const ImageGenerator = require('./image/image-generator');
const XHSPublisher = require('./publish/xhs-publisher');

/**
 * 小红书自动化运营调度器
 */
class Scheduler {
  constructor() {
    this.minder = new MinderClient();
    this.ai = new KimiClient();
    this.imageGen = new ImageGenerator();
    this.publisher = new XHSPublisher();
    
    this.postCount = 0;
    this.maxDailyPosts = config.xiaohongshu.publish.maxDailyPosts;
    this.publishHours = config.xiaohongshu.publish.publishHours;
    
    // 确保日志目录存在
    this.logDir = path.join(__dirname, '../logs');
    fs.ensureDirSync(this.logDir);
  }
  
  /**
   * 记录日志
   */
  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${type.toUpperCase()}] ${message}`;
    
    console.log(logMessage);
    
    // 写入日志文件
    const logFile = path.join(this.logDir, `${new Date().toISOString().split('T')[0]}.log`);
    fs.appendFileSync(logFile, logMessage + '\n');
  }
  
  /**
   * 启动调度器
   */
  start() {
    this.log('🚀 小红书自动化运营系统启动');
    this.log(`📅 计划发布时间: ${this.publishHours.join(':00, ')}:00`);
    this.log(`📊 每日最大发布数: ${this.maxDailyPosts}`);
    
    // 设置定时任务
    this.publishHours.forEach(hour => {
      cron.schedule(`0 ${hour} * * *`, async () => {
        this.log(`⏰ 触发定时任务 - ${hour}:00`);
        await this.autoPublish();
      });
    });
    
    // 每日重置计数器
    cron.schedule('0 0 * * *', () => {
      this.log('🌅 新的一天，重置发布计数');
      this.postCount = 0;
    });
    
    this.log('✅ 定时任务已设置，等待执行...');
    
    // 保持进程运行
    process.on('SIGINT', () => {
      this.log('👋 正在关闭调度器...');
      process.exit(0);
    });
  }
  
  /**
   * 自动发布流程
   */
  async autoPublish() {
    // 检查发布限制
    if (this.postCount >= this.maxDailyPosts) {
      this.log('⚠️ 今日发布数量已达上限，跳过本次发布', 'warn');
      return;
    }
    
    try {
      this.log('📦 开始自动发布流程...');
      
      // Step 1: 获取念念数据
      this.log('📊 获取念念数据...');
      const minderData = await this.minder.getTodayData();
      this.log(`✅ 获取到 ${minderData.items.length} 条数据`);
      
      // Step 2: 生成AI内容
      this.log('🤖 生成AI内容...');
      const content = await this.ai.generatePost(minderData);
      this.log('✅ 内容生成完成');
      this.log(`📝 标题: ${content.title}`);
      
      // Step 3: 生成配图
      this.log('🎨 生成配图...');
      const caption = await this.ai.generateImageCaption(minderData);
      const imagePath = await this.imageGen.generateShareCard(minderData, caption);
      this.log(`✅ 图片生成完成: ${imagePath}`);
      
      // Step 4: 发布到小红书
      this.log('📱 正在发布到小红书...');
      
      await this.publisher.init();
      
      const result = await this.publisher.publish({
        title: content.title,
        content: content.fullContent,
        images: [imagePath],
        topics: content.hashtags
      });
      
      await this.publisher.close();
      
      if (result.success) {
        this.postCount++;
        this.log(`✅ 发布成功！今日已发布 ${this.postCount}/${this.maxDailyPosts} 条`);
      } else {
        this.log(`❌ 发布失败: ${result.error}`, 'error');
      }
      
    } catch (error) {
      this.log(`❌ 自动发布出错: ${error.message}`, 'error');
      console.error(error);
      
      // 确保浏览器关闭
      try {
        await this.publisher.close();
      } catch (e) {
        // ignore
      }
    }
  }
  
  /**
   * 手动发布（用于测试）
   */
  async manualPublish() {
    this.log('🎯 手动发布模式');
    await this.autoPublish();
  }
  
  /**
   * 生成内容预览（不发布）
   */
  async preview() {
    this.log('👀 生成内容预览...');
    
    try {
      // 获取数据
      const minderData = await this.minder.getTodayData();
      
      // 生成内容
      const content = await this.ai.generatePost(minderData);
      const caption = await this.ai.generateImageCaption(minderData);
      const imagePath = await this.imageGen.generateShareCard(minderData, caption);
      
      this.log('✅ 预览内容生成完成');
      this.log('');
      this.log('========== 预览内容 ==========');
      this.log(`标题: ${content.title}`);
      this.log('');
      this.log('内容:');
      this.log(content.fullContent);
      this.log('');
      this.log(`图片: ${imagePath}`);
      this.log('============================');
      
      return {
        content,
        imagePath
      };
      
    } catch (error) {
      this.log(`❌ 预览生成失败: ${error.message}`, 'error');
      throw error;
    }
  }
}

// 如果直接运行此文件
if (require.main === module) {
  const scheduler = new Scheduler();
  
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--preview')) {
    // 预览模式
    scheduler.preview();
  } else if (args.includes('--manual')) {
    // 手动发布
    scheduler.manualPublish();
  } else {
    // 启动定时任务
    scheduler.start();
  }
}

module.exports = Scheduler;
