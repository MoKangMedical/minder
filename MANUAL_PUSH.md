# 手动推送指南

由于GitHub需要身份验证，请手动执行以下步骤：

## 方法1: 使用GitHub Token (推荐)

### 1. 创建GitHub Token
1. 访问 https://github.com/settings/tokens
2. 点击 "Generate new token" (classic)
3. 选择有效期和权限：
   - ✅ `repo` (完整仓库访问)
4. 点击 "Generate token"
5. **复制生成的Token** (只显示一次！)

### 2. 推送代码
```bash
cd /root/.openclaw/workspace/minder-web

# 设置远程仓库
git remote add origin https://github.com/MoKangMedical/minder.git

# 推送 (使用Token作为密码)
git push -u origin master

# 当提示输入用户名时，输入你的GitHub用户名: MoKangMedical
# 当提示输入密码时，粘贴你的Token
```

---

## 方法2: 使用SSH (更安全)

### 1. 生成SSH密钥
```bash
ssh-keygen -t ed25519 -C "your@email.com"
```

### 2. 添加公钥到GitHub
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 复制 `~/.ssh/id_ed25519.pub` 内容并粘贴
4. 点击 "Add SSH key"

### 3. 使用SSH推送
```bash
cd /root/.openclaw/workspace/minder-web
git remote add origin git@github.com:MoKangMedical/minder.git
git push -u origin master
```

---

## 方法3: 下载后手动上传

如果命令行推送不方便，可以：

### 1. 下载代码压缩包
```bash
cd /root/.openclaw/workspace/
zip -r minder-web.zip minder-web/
```

### 2. 在GitHub网页上传
1. 访问 https://github.com/MoKangMedical/minder
2. 点击 "Add file" → "Upload files"
3. 上传 `minder-web.zip` 中的所有文件
4. 点击 "Commit changes"

---

## ✅ 推送完成后

1. 访问 https://github.com/MoKangMedical/minder 确认代码已上传
2. 进入 Settings → Pages
3. Source 选择 `master` 或 `main` 分支
4. 点击 Save
5. 等待1-2分钟后访问: https://mokangmedical.github.io/minder/

---

**需要帮助随时问雪梨！** 🍐💕