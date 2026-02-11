const { chromium } = require('playwright');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config/config');

/**
 * 小红书登录脚本
 * 用于首次登录并保存Cookie
 */
async function login() {
  console.log('🦋 小红书登录助手');
  console.log('==================');
  console.log('');
  
  const cookiePath = config.xiaohongshu.cookiePath;
  
  // 确保目录存在
  await fs.ensureDir(path.dirname(cookiePath));
  
  console.log('正在启动浏览器...');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  
  const page = await context.newPage();
  
  console.log('正在打开登录页面...');
  await page.goto('https://www.xiaohongshu.com/login', {
    waitUntil: 'networkidle'
  });
  
  console.log('');
  console.log('📱 请在浏览器中完成以下操作：');
  console.log('   1. 选择登录方式（手机号/微信/微博）');
  console.log('   2. 完成登录验证');
  console.log('   3. 等待页面跳转到个人主页');
  console.log('');
  console.log('登录成功后，按回车键保存Cookie...');
  console.log('（按 Ctrl+C 取消）');
  console.log('');
  
  // 等待用户完成登录
  process.stdin.once('data', async () => {
    try {
      // 保存Cookie
      const cookies = await context.cookies();
      fs.writeFileSync(cookiePath, JSON.stringify(cookies, null, 2));
      
      console.log('');
      console.log('✅ Cookie保存成功！');
      console.log(`📁 保存位置: ${cookiePath}`);
      console.log('');
      console.log('下次发布时将自动使用这些Cookie登录。');
      
    } catch (error) {
      console.error('❌ 保存Cookie失败:', error.message);
    } finally {
      await browser.close();
      process.exit(0);
    }
  });
}

login().catch(console.error);
