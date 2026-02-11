#!/usr/bin/env node

const Scheduler = require('./src/scheduler');

const args = process.argv.slice(2);
const scheduler = new Scheduler();

console.log('🦋 念念 × 小红书自动化运营系统');
console.log('================================');
console.log('');

if (args.includes('--login')) {
  console.log('启动登录助手...');
  require('./src/publish/xhs-login');
} else if (args.includes('--preview')) {
  console.log('生成内容预览...');
  scheduler.preview();
} else if (args.includes('--manual')) {
  console.log('手动发布模式...');
  scheduler.manualPublish();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log('使用方法:');
  console.log('');
  console.log('  node index.js           启动定时任务');
  console.log('  node index.js --login   登录小红书');
  console.log('  node index.js --preview 预览生成内容');
  console.log('  node index.js --manual  手动发布一条');
  console.log('');
  console.log('或使用 npm 命令:');
  console.log('  npm start               启动定时任务');
  console.log('  npm run login           登录小红书');
  console.log('  npm run publish:manual  手动发布');
  console.log('');
} else {
  console.log('启动定时任务...');
  console.log('按 Ctrl+C 停止');
  console.log('');
  scheduler.start();
}
