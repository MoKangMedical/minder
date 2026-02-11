const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const config = require('../../config/config');

/**
 * 小红书发布器
 * 使用 Playwright 自动化发布
 */
class XHSPublisher {
  constructor() {
    this.cookiePath = config.xiaohongshu.cookiePath;
    this.browser = null;
    this.context = null;
    this.page = null;
  }
  
  /**
   * 初始化浏览器
   */
  async init() {
    this.browser = await chromium.launch({
      headless: false, // 设置为true可以隐藏浏览器
      slowMo: 100
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    
    this.page = await this.context.newPage();
    
    // 加载Cookie（如果存在）
    await this.loadCookies();
  }
  
  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
  
  /**
   * 加载Cookie
   */
  async loadCookies() {
    if (fs.existsSync(this.cookiePath)) {
      const cookies = JSON.parse(fs.readFileSync(this.cookiePath, 'utf8'));
      await this.context.addCookies(cookies);
      console.log('✅ Cookie加载成功');
    }
  }
  
  /**
   * 保存Cookie
   */
  async saveCookies() {
    const cookies = await this.context.cookies();
    await fs.ensureDir(path.dirname(this.cookiePath));
    fs.writeFileSync(this.cookiePath, JSON.stringify(cookies, null, 2));
    console.log('✅ Cookie保存成功');
  }
  
  /**
   * 检查登录状态
   */
  async checkLogin() {
    try {
      await this.page.goto('https://www.xiaohongshu.com/user/me', {
        waitUntil: 'networkidle',
        timeout: 10000
      });
      
      // 检查是否在个人主页
      const isLoggedIn = await this.page.$eval('.user-name', () => true).catch(() => false);
      
      if (isLoggedIn) {
        console.log('✅ 已登录');
        return true;
      } else {
        console.log('⚠️ 未登录或Cookie失效');
        return false;
      }
    } catch (error) {
      console.log('⚠️ 登录检查失败:', error.message);
      return false;
    }
  }
  
  /**
   * 手动登录
   * 首次使用或Cookie失效时调用
   */
  async login() {
    console.log('🔄 请手动登录小红书...');
    
    await this.page.goto('https://www.xiaohongshu.com/login', {
      waitUntil: 'networkidle'
    });
    
    // 等待用户手动登录
    console.log('请在浏览器中完成登录，然后按回车键继续...');
    
    // 等待登录成功（检测URL变化或特定元素）
    await this.page.waitForSelector('.user-name', {
      timeout: 300000 // 5分钟超时
    });
    
    // 保存Cookie
    await this.saveCookies();
    console.log('✅ 登录成功，Cookie已保存');
  }
  
  /**
   * 发布笔记
   * @param {Object} options - 发布选项
   * @param {string} options.title - 标题
   * @param {string} options.content - 内容
   * @param {string[]} options.images - 图片路径数组
   * @param {string[]} options.topics - 话题标签
   */
  async publish({ title, content, images, topics = [] }) {
    try {
      // 检查登录状态
      const isLoggedIn = await this.checkLogin();
      if (!isLoggedIn) {
        await this.login();
      }
      
      console.log('📝 开始发布笔记...');
      
      // 进入发布页面
      await this.page.goto('https://www.xiaohongshu.com/explore', {
        waitUntil: 'networkidle'
      });
      
      // 点击发布按钮
      await this.page.click('a[href="/publish"]');
      await this.page.waitForLoadState('networkidle');
      
      // 上传图片
      console.log('📷 上传图片...');
      const input = await this.page.$('input[type="file"]');
      await input.setInputFiles(images);
      
      // 等待图片上传完成
      await this.page.waitForTimeout(3000);
      
      // 填写标题
      console.log('✏️ 填写标题...');
      await this.page.fill('textarea[placeholder*="标题"]', title);
      
      // 填写正文
      console.log('📝 填写正文...');
      await this.page.fill('div[contenteditable="true"]', content);
      
      // 添加话题
      if (topics.length > 0) {
        console.log('🏷️ 添加话题...');
        for (const topic of topics) {
          await this.page.click('text="# 话题"');
          await this.page.fill('input[placeholder*="搜索话题"]', topic.replace('#', ''));
          await this.page.waitForTimeout(1000);
          await this.page.click('.topic-item:first-child');
        }
      }
      
      // 发布
      console.log('🚀 发布中...');
      await this.page.click('button:has-text("发布")');
      
      // 等待发布成功
      await this.page.waitForSelector('.publish-success, .note-detail', {
        timeout: 30000
      });
      
      console.log('✅ 发布成功！');
      
      // 截图保存
      const screenshotPath = path.join(config.image.outputDir, `published-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath });
      console.log(`📸 截图已保存: ${screenshotPath}`);
      
      return {
        success: true,
        screenshot: screenshotPath
      };
      
    } catch (error) {
      console.error('❌ 发布失败:', error);
      
      // 保存错误截图
      const errorPath = path.join(config.image.outputDir, `error-${Date.now()}.png`);
      await this.page.screenshot({ path: errorPath });
      
      return {
        success: false,
        error: error.message,
        screenshot: errorPath
      };
    }
  }
}

module.exports = XHSPublisher;
