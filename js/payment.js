// 念念商业化模块 - 支付与会员系统

const PAYMENT_CONFIG = {
    // 微信支付配置 (需要替换为真实的商户信息)
    WECHAT_APPID: 'wxYOUR_APPID',
    
    // 产品价格
    PRICES: {
        MONTHLY: 9.9,      // 月度会员
        YEARLY: 68,        // 年度会员
        YEARLY_ORIGINAL: 118, // 年度原价(用于显示折扣)
        LIFETIME: 198      // 终身会员
    },
    
    // 产品ID
    PRODUCT_IDS: {
        MONTHLY: 'minder_vip_monthly',
        YEARLY: 'minder_vip_yearly',
        LIFETIME: 'minder_vip_lifetime'
    }
};

// 会员状态管理
class MembershipManager {
    constructor() {
        this.isVip = this.checkVipStatus();
        this.vipExpiry = this.getVipExpiry();
        this.dailyQuota = this.getDailyQuota();
    }
    
    // 检查VIP状态
    checkVipStatus() {
        const vipStatus = localStorage.getItem('minder_vip_status');
        const expiry = localStorage.getItem('minder_vip_expiry');
        
        if (!vipStatus || !expiry) return false;
        
        // 检查是否过期
        if (Date.now() > parseInt(expiry)) {
            this.clearVipStatus();
            return false;
        }
        
        return vipStatus === 'true';
    }
    
    // 获取VIP到期时间
    getVipExpiry() {
        return localStorage.getItem('minder_vip_expiry') || '0';
    }
    
    // 获取每日额度
    getDailyQuota() {
        if (this.isVip) return Infinity;
        
        const today = new Date().toDateString();
        const quotaKey = `minder_quota_${today}`;
        const used = parseInt(localStorage.getItem(quotaKey) || '0');
        
        return {
            total: 3,  // 免费用户每日3个
            used: used,
            remaining: Math.max(0, 3 - used)
        };
    }
    
    // 使用额度
    useQuota() {
        if (this.isVip) return true;
        
        const today = new Date().toDateString();
        const quotaKey = `minder_quota_${today}`;
        const used = parseInt(localStorage.getItem(quotaKey) || '0');
        
        if (used >= 3) {
            return false;  // 额度已用完
        }
        
        localStorage.setItem(quotaKey, (used + 1).toString());
        return true;
    }
    
    // 设置VIP状态
    setVipStatus(durationDays) {
        const expiry = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
        localStorage.setItem('minder_vip_status', 'true');
        localStorage.setItem('minder_vip_expiry', expiry.toString());
        localStorage.setItem('minder_vip_start', Date.now().toString());
        this.isVip = true;
        this.vipExpiry = expiry.toString();
    }
    
    // 清除VIP状态
    clearVipStatus() {
        localStorage.removeItem('minder_vip_status');
        localStorage.removeItem('minder_vip_expiry');
        localStorage.removeItem('minder_vip_start');
        this.isVip = false;
    }
    
    // 获取VIP剩余天数
    getRemainingDays() {
        if (!this.isVip) return 0;
        const expiry = parseInt(this.vipExpiry);
        const remaining = expiry - Date.now();
        return Math.ceil(remaining / (24 * 60 * 60 * 1000));
    }
}

// 支付管理器
class PaymentManager {
    constructor() {
        this.membership = new MembershipManager();
    }
    
    // 创建订单
    async createOrder(productId, amount) {
        // 模拟创建订单
        const orderId = 'MINDER' + Date.now();
        return {
            orderId: orderId,
            productId: productId,
            amount: amount,
            timestamp: Date.now()
        };
    }
    
    // 调起微信支付
    async initiateWechatPay(order) {
        // 这里需要接入真实的微信支付JSAPI
        // 简化版模拟支付流程
        
        showToast('正在调起支付...');
        
        // 模拟支付流程
        return new Promise((resolve) => {
            setTimeout(() => {
                // 模拟支付成功
                this.handlePaymentSuccess(order);
                resolve({ success: true });
            }, 2000);
        });
    }
    
    // 处理支付成功
    handlePaymentSuccess(order) {
        let durationDays = 30;
        
        switch(order.productId) {
            case PAYMENT_CONFIG.PRODUCT_IDS.MONTHLY:
                durationDays = 30;
                break;
            case PAYMENT_CONFIG.PRODUCT_IDS.YEARLY:
                durationDays = 365;
                break;
            case PAYMENT_CONFIG.PRODUCT_IDS.LIFETIME:
                durationDays = 36500;  // 100年
                break;
        }
        
        this.membership.setVipStatus(durationDays);
        
        // 记录购买
        this.recordPurchase(order);
        
        // 显示成功
        showPaymentSuccessModal(order);
    }
    
    // 记录购买历史
    recordPurchase(order) {
        const purchases = JSON.parse(localStorage.getItem('minder_purchases') || '[]');
        purchases.push({
            orderId: order.orderId,
            productId: order.productId,
            amount: order.amount,
            timestamp: Date.now()
        });
        localStorage.setItem('minder_purchases', JSON.stringify(purchases));
    }
    
    // 获取购买历史
    getPurchaseHistory() {
        return JSON.parse(localStorage.getItem('minder_purchases') || '[]');
    }
}

// 全局实例
const membershipManager = new MembershipManager();
const paymentManager = new PaymentManager();

// 检查额度并提示升级
function checkQuotaAndPrompt() {
    if (membershipManager.isVip) return true;
    
    const quota = membershipManager.getDailyQuota();
    
    if (quota.remaining <= 0) {
        showUpgradeModal();
        return false;
    }
    
    // 剩余1个时提示
    if (quota.remaining === 1) {
        showToast('今日还剩1个免费额度，升级会员无限使用 💕');
    }
    
    return true;
}

// 显示升级弹窗
function showUpgradeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal upgrade-modal';
    modal.innerHTML = `
        <div class="modal-content upgrade-content">
            <div class="upgrade-header">
                <span class="upgrade-icon">💎</span>
                <h2>升级念念会员</h2>
                <p>别让重要的念想被遗忘</p>
            </div>
            
            <div class="upgrade-plans">
                <div class="plan-card recommended" onclick="selectPlan('yearly')">
                    <div class="plan-badge">推荐</div>
                    <h3>年度会员</h3>
                    <div class="plan-price">
                        <span class="currency">¥</span>
                        <span class="amount">68</span>
                        <span class="original">¥118</span>
                    </div>
                    <div class="plan-period">/年</div>
                    <ul class="plan-features">
                        <li>✓ 无限念想记录</li>
                        <li>✓ 高级AI解析</li>
                        <li>✓ 云端同步</li>
                        <li>✓ 数据导出</li>
                        <li>✓ 专属客服</li>
                    </ul>
                    <button class="btn-plan" onclick="event.stopPropagation(); purchase('yearly')">
                        立即开通
                    </button>
                </div>
                
                <div class="plan-card" onclick="selectPlan('monthly')">
                    <h3>月度会员</h3>
                    <div class="plan-price">
                        <span class="currency">¥</span>
                        <span class="amount">9.9</span>
                    </div>
                    <div class="plan-period">/月</div>
                    <ul class="plan-features">
                        <li>✓ 无限念想记录</li>
                        <li>✓ 高级AI解析</li>
                        <li>✓ 云端同步</li>
                    </ul>
                    <button class="btn-plan secondary" onclick="event.stopPropagation(); purchase('monthly')">
                        选择月度
                    </button>
                </div>
                
                <div class="plan-card lifetime" onclick="selectPlan('lifetime')">
                    <div class="plan-badge hot">超值</div>
                    <h3>终身会员</h3>
                    <div class="plan-price">
                        <span class="currency">¥</span>
                        <span class="amount">198</span>
                    </div>
                    <div class="plan-period">永久</div>
                    <ul class="plan-features">
                        <li>✓ 所有年度会员功能</li>
                        <li>✓ 终身免费更新</li>
                        <li>✓ 专属徽章</li>
                        <li>✓ 优先体验新功能</li>
                    </ul>
                    <button class="btn-plan premium" onclick="event.stopPropagation(); purchase('lifetime')">
                        一次购买永久使用
                    </button>
                </div>
            </div>
            
            <div class="upgrade-footer">
                <p>🎁 新用户首月仅需 <span class="highlight">¥1</span></p>
                <p class="safe-tip">🔒 安全支付 · 7天无理由退款</p>
            </div>
            
            <button class="btn-close" onclick="closeUpgradeModal()">✕</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 关闭弹窗函数
    window.closeUpgradeModal = function() {
        modal.remove();
    };
    
    // 选择套餐
    window.selectPlan = function(plan) {
        document.querySelectorAll('.plan-card').forEach(card => {
            card.classList.remove('selected');
        });
        event.currentTarget.classList.add('selected');
    };
    
    // 购买
    window.purchase = async function(plan) {
        let productId, amount;
        
        switch(plan) {
            case 'monthly':
                productId = PAYMENT_CONFIG.PRODUCT_IDS.MONTHLY;
                amount = PAYMENT_CONFIG.PRICES.MONTHLY;
                break;
            case 'yearly':
                productId = PAYMENT_CONFIG.PRODUCT_IDS.YEARLY;
                amount = PAYMENT_CONFIG.PRICES.YEARLY;
                break;
            case 'lifetime':
                productId = PAYMENT_CONFIG.PRODUCT_IDS.LIFETIME;
                amount = PAYMENT_CONFIG.PRICES.LIFETIME;
                break;
        }
        
        const order = await paymentManager.createOrder(productId, amount);
        await paymentManager.initiateWechatPay(order);
        
        closeUpgradeModal();
    };
}

// 显示支付成功弹窗
function showPaymentSuccessModal(order) {
    const modal = document.createElement('div');
    modal.className = 'modal success-modal';
    modal.innerHTML = `
        <div class="modal-content success-content">
            <div class="success-icon">🎉</div>
            <h2>支付成功！</h2>
            <p>欢迎加入念念会员 💎</p>
            <div class="success-details">
                <p>订单号: ${order.orderId}</p>
                <p>金额: ¥${order.amount}</p>
            </div>
            <button class="btn-primary" onclick="closeSuccessModal()">开始使用</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    window.closeSuccessModal = function() {
        modal.remove();
        location.reload();  // 刷新页面更新VIP状态
    };
}

// 显示VIP状态
function showVipStatus() {
    if (!membershipManager.isVip) return;
    
    const remainingDays = membershipManager.getRemainingDays();
    const badge = document.createElement('div');
    badge.className = 'vip-badge';
    badge.innerHTML = `
        <span class="vip-icon">💎</span>
        <span class="vip-text">VIP 剩余${remainingDays}天</span>
    `;
    
    document.querySelector('.header').appendChild(badge);
}

// 导出到全局
window.membershipManager = membershipManager;
window.paymentManager = paymentManager;
window.checkQuotaAndPrompt = checkQuotaAndPrompt;
window.showUpgradeModal = showUpgradeModal;