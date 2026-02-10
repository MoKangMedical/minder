"ui";

// 念念小红书自动发布脚本
// 使用 AutoX.js (原Auto.js) 运行
// 功能：自动打开小红书，填写文案，选择图片，发布笔记

ui.layout(
    <vertical padding="16">
        <text text="🍐 念念小红书自动发布" textSize="20sp" textColor="#FF6B35" gravity="center"/>
        <text text="请确保已安装小红书APP并登录" textSize="12sp" textColor="#999" gravity="center" marginTop="8"/>
        
        <card marginTop="16" cardCornerRadius="8dp" cardElevation="2dp">
            <vertical padding="12">
                <text text="发布内容设置" textSize="16sp" textColor="#333" textStyle="bold"/>
                
                <text text="标题：" marginTop="12"/>
                <input id="title" text="花了3天做的APP，没想到真的有人用" textSize="14sp" hint="输入笔记标题"/>
                
                <text text="正文：" marginTop="8"/>
                <textarea id="content" textSize="14sp" lines="8" hint="输入笔记正文">
姐妹们！我做了个超实用的APP叫「念念」🍐

以前我总是忘事：
❌ 答应给妈妈打电话，结果忘了
❌ 朋友生日过了才想起来
❌ 重要的会议记错时间

后来我意识到：不是我不上心，是工具太麻烦！

市面上的待办APP：
❌ 要手动输入
❌ 要设置时间
❌ 操作太复杂

所以我做了念念：
✅ 直接说话，AI自动理解
✅ 不用设置时间，AI智能提取
✅ 完成后还有温暖的鼓励卡片

比如你说："明天下午3点给妈妈打电话"
念念自动创建提醒，到点就温柔通知你～

现在创始会员预售：
🔥 原价¥68/年 → 特惠¥29/年
🔥 限量100名

想用的姐妹评论"念念"，我发你链接！
                </textarea>
                
                <text text="标签（用空格分隔）：" marginTop="8"/>
                <input id="tags" text="#效率工具 #AI应用 #提醒事项 #时间管理 #生产力工具 #念念APP #创业日记 #自律 #APP推荐" textSize="14sp"/>
            </vertical>
        </card>
        
        <card marginTop="12" cardCornerRadius="8dp" cardElevation="2dp">
            <vertical padding="12">
                <text text="图片设置" textSize="16sp" textColor="#333" textStyle="bold"/>
                <text text="请选择5张图片（建议顺序：封面→痛点→功能→效果→价格）" textSize="12sp" textColor="#666"/>
                <button id="selectImages" text="选择图片" marginTop="8"/>
                <text id="imageStatus" text="未选择图片" textSize="12sp" textColor="#999" marginTop="4"/>
            </vertical>
        </card>
        
        <button id="start" text="🚀 开始自动发布" textSize="16sp" textColor="white" bg="#FF6B35" marginTop="20"/>
        
        <text id="log" text="等待开始..." textSize="12sp" textColor="#666" marginTop="12" gravity="center"/>
        
        <text text="⚠️ 使用前请确保：
1. 已安装小红书APP并登录
2. 已开启无障碍服务权限
3. 手机已解锁
4. 建议先手动测试一次" textSize="11sp" textColor="#999" marginTop="16"/>
    </vertical>
);

// 日志函数
function log(msg) {
    ui.run(() => {
        ui.log.setText(msg);
    });
    console.log(msg);
    toast(msg);
}

// 检查无障碍权限
function checkAccessibility() {
    if (!auto.service) {
        log("请开启无障碍服务");
        app.startActivity({
            action: "android.settings.ACCESSIBILITY_SETTINGS"
        });
        return false;
    }
    return true;
}

// 等待元素出现
function waitForElement(selector, timeout) {
    timeout = timeout || 10000;
    let start = Date.now();
    while (Date.now() - start < timeout) {
        let element = selector.findOne(500);
        if (element) return element;
    }
    return null;
}

// 安全点击
function safeClick(element) {
    if (element && element.clickable()) {
        element.click();
        return true;
    }
    if (element) {
        click(element.bounds().centerX(), element.bounds().centerY());
        return true;
    }
    return false;
}

// 主发布函数
function publishToXiaohongshu() {
    log("开始自动发布流程...");
    
    // 1. 打开小红书
    log("正在打开小红书...");
    launchApp("小红书");
    sleep(3000);
    
    // 2. 点击底部"+"按钮
    log("点击发布按钮...");
    let plusBtn = text("+").findOne(5000) || desc("发布").findOne(2000);
    if (!plusBtn) {
        // 尝试通过坐标点击（底部中间）
        click(device.width / 2, device.height - 100);
    } else {
        safeClick(plusBtn);
    }
    sleep(2000);
    
    // 3. 选择"图文"模式
    log("选择图文模式...");
    let photoTab = text("图文").findOne(3000) || textContains("图文").findOne(2000);
    if (photoTab) {
        safeClick(photoTab);
        sleep(1000);
    }
    
    // 4. 选择图片
    log("选择图片...");
    let selectBtn = text("下一步").findOne(3000);
    if (!selectBtn) {
        // 可能在相册选择界面
        let album = textContains("相册").findOne(2000);
        if (album) safeClick(album);
        sleep(2000);
    }
    
    // 选择5张图片（需要用户先准备好）
    // 这里需要用户手动选择或使用预设图片
    log("请手动选择5张图片，然后点击"下一步"...");
    
    // 等待用户选择图片或自动选择
    let nextBtn = text("下一步").findOne(30000); // 等待30秒
    if (nextBtn) {
        safeClick(nextBtn);
        sleep(2000);
    }
    
    // 5. 填写标题
    log("填写标题...");
    let titleInput = className("EditText").findOne(5000);
    if (titleInput) {
        titleInput.setText(ui.title.getText());
        sleep(1000);
    }
    
    // 6. 填写正文
    log("填写正文...");
    let contentInput = className("EditText").depth(10).findOne(5000);
    if (contentInput) {
        contentInput.setText(ui.content.getText() + "\n\n" + ui.tags.getText());
        sleep(1000);
    }
    
    // 7. 点击发布
    log("准备发布...");
    let publishBtn = text("发布").findOne(5000) || text("发布笔记").findOne(3000);
    if (publishBtn) {
        log("点击发布按钮！");
        safeClick(publishBtn);
        sleep(5000);
        log("✅ 发布完成！");
    } else {
        log("❌ 未找到发布按钮");
    }
}

// 选择图片按钮
ui.selectImages.click(function() {
    // 打开相册选择
    let intent = {
        action: "android.intent.action.GET_CONTENT",
        type: "image/*"
    };
    // 这里简化处理，实际应该使用文件选择器
    ui.run(() => {
        ui.imageStatus.setText("请手动准备好5张图片");
    });
    toast("请确保相册中有5张准备好的图片");
});

// 开始按钮
ui.start.click(function() {
    if (!checkAccessibility()) {
        return;
    }
    
    threads.start(function() {
        try {
            publishToXiaohongshu();
        } catch (e) {
            log("❌ 出错: " + e.message);
            console.error(e);
        }
    });
});

log("脚本已加载，点击"开始自动发布"运行");