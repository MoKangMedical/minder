# 小红书自动化运营系统

## 系统架构

```
┌─────────────────┐
│   定时任务       │  ← 每天9:00自动执行
│   (Node-cron)   │
└────────┬────────┘
         ▼
┌─────────────────┐
│  获取念念数据    │  ← 从 localStorage 或 API 读取
│   (minder-data) │
└────────┬────────┘
         ▼
┌─────────────────┐
│  AI生成内容     │  ← 调用 Kimi API
│  (kimi-client)  │
└────────┬────────┘
         ▼
┌─────────────────┐
│  生成配图       │  ← html2canvas 或 Canvas API
│ (image-gen)     │
└────────┬────────┘
         ▼
┌─────────────────┐
│  发布到小红书    │  ← Playwright 自动化
│ (xhs-publisher) │
└─────────────────┘
```

## 文件结构

```
/xiaohongshu-auto/
├── config/
│   └── config.js          # 配置文件
├── src/
│   ├── data/
│   │   └── minder-client.js    # 念念数据获取
│   ├── ai/
│   │   └── kimi-client.js      # AI内容生成
│   ├── image/
│   │   └── image-generator.js  # 配图生成
│   ├── publish/
│   │   └── xhs-publisher.js    # 小红书发布
│   └── scheduler.js       # 定时任务
├── templates/
│   └── share-card.html    # 分享卡片模板
├── cookies/
│   └── .gitkeep          # 存储登录Cookie
├── screenshots/
│   └── .gitkeep          # 发布截图存档
├── package.json
└── README.md
```

## 安装依赖

```bash
cd xiaohongshu-auto
npm install
```

## 配置

1. 复制配置模板：
```bash
cp config/config.example.js config/config.js
```

2. 编辑 `config/config.js`，填入你的信息：
- Kimi API Key
- 小红书账号密码

## 首次运行 - 登录小红书

```bash
npm run login
```

这将打开浏览器让你手动登录小红书，登录成功后会保存Cookie。

## 启动自动运营

```bash
npm start
```

或开发模式：
```bash
npm run dev
```

## 手动发布测试

```bash
npm run publish:manual
```

## 内容策略

### 发布时间表
- 09:00 - 早安日程分享
- 12:00 - 效率技巧
- 18:00 - 日常记录
- 21:00 - 深度内容

### 内容类型
1. **日程展示** - 展示一天的规划
2. **效率技巧** - 如何高效管理时间
3. **用户故事** - 使用念念改变生活的案例
4. **功能亮点** - 新功能介绍
5. **生活美学** - 记录美好的瞬间

## 注意事项

⚠️ **风险提示**
- 小红书对自动化操作有限制，请控制发布频率
- 建议每天最多发布2-3条
- 定期检查账号状态
- 准备好人工接管方案

## 监控

查看发布日志：
```bash
tail -f logs/publish.log
```

查看截图存档：
```bash
ls screenshots/
```

## 故障排查

### Cookie失效
```bash
npm run login
```

### 发布失败
检查日志文件 `logs/error.log`

### AI生成失败
检查Kimi API Key是否有效

## License

MIT
