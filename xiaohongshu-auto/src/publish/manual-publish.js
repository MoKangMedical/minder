const Scheduler = require('../scheduler');

/**
 * 手动发布脚本
 * 用于测试发布流程
 */
async function manualPublish() {
  console.log('📝 手动发布模式');
  console.log('==================');
  console.log('');
  
  const scheduler = new Scheduler();
  
  try {
    await scheduler.manualPublish();
  } catch (error) {
    console.error('❌ 发布失败:', error);
    process.exit(1);
  }
}

manualPublish();
