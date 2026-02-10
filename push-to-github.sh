#!/bin/bash
# 推送念念到GitHub脚本

echo "🍐 正在推送念念到GitHub..."

cd /root/.openclaw/workspace/minder-web

# 设置远程仓库
git remote remove origin 2>/dev/null
git remote add origin https://github.com/MoKangMedical/minder.git

# 重命名分支
git branch -M main

# 推送代码
echo "请输入你的GitHub用户名和密码(或Token)..."
git push -u origin main

echo "✅ 完成！"
echo "访问: https://github.com/MoKangMedical/minder"
