# GitHub Pages 部署指南

## ✅ Git仓库已初始化

项目已创建Git仓库并完成初始提交。

---

## 🚀 推送到GitHub步骤

### 1. 在GitHub创建仓库

访问: https://github.com/new

填写信息:
- **Repository name**: `minder`
- **Description**: 念念 - 你的第二记忆
- **Public** (选中)
- ✅ 勾选 "Add a README file" (可选)

点击 **Create repository**

---

### 2. 连接本地仓库

在你的电脑终端执行:

```bash
# 进入项目目录
cd /root/.openclaw/workspace/minder-web

# 添加远程仓库 (替换为你的用户名)
git remote add origin https://github.com/MoKangMedical/minder.git

# 推送到GitHub
git push -u origin master
```

---

### 3. 开启GitHub Pages

1. 访问你的仓库: `https://github.com/MoKangMedical/minder`
2. 点击 **Settings** (设置)
3. 左侧菜单选择 **Pages**
4. **Source** 选择:
   - Branch: `master`
   - Folder: `/ (root)`
5. 点击 **Save**

---

### 4. 访问网站

等待1-2分钟后，访问:

```
https://mokangmedical.github.io/minder/
```

🎉 念念上线了！

---

## 📋 快速命令汇总

```bash
# 1. 创建GitHub仓库后，执行:
cd /root/.openclaw/workspace/minder-web
git remote add origin https://github.com/MoKangMedical/minder.git
git push -u origin master

# 2. 之后更新代码:
git add .
git commit -m "更新内容"
git push
```

---

## 🔄 自动部署

GitHub Pages会自动部署 `master` 分支的代码。
每次 `git push` 后，网站会在1-2分钟内自动更新。

---

## 🎨 自定义域名 (可选)

如果你想使用自己的域名:

1. 在仓库创建 `CNAME` 文件
2. 文件内容填写你的域名，如: `minder.yourdomain.com`
3. 在你的域名DNS设置中添加CNAME记录指向 `mokangmedical.github.io`

---

## 📱 项目信息

| 项目 | 内容 |
|------|------|
| 仓库地址 | https://github.com/MoKangMedical/minder |
| 网站地址 | https://mokangmedical.github.io/minder/ |
| 用户名 | MoKangMedical |
| 项目名 | minder |

---

## ❓ 常见问题

### Q: 推送失败怎么办？
**A**: 检查GitHub仓库是否已创建，以及用户名是否正确

### Q: 网站404怎么办？
**A**: 检查GitHub Pages设置中的分支是否正确选择了 `master`

### Q: 更新后没有变化？
**A**: GitHub Pages部署需要1-2分钟，请耐心等待或强制刷新页面 (Ctrl+F5)

---

**祝你成功！** 🍐💕