// 念念 (Minder) - Yore Style
// 你的第二记忆

const CONFIG = {
    KIMI_API_KEY: 'sk-JLr7p2LHV9sSnmE0eNZA3XCCHH0Ij76JZBp9rDbbcfJEIYZQ',
    KIMI_API_URL: 'https://api.moonshot.cn/v1/chat/completions',
    APP_NAME: '念念',
    APP_VERSION: '2.0.0'
};

// State
let items = JSON.parse(localStorage.getItem('minder_items') || '[]');
let currentParsedResult = null;
let isRecording = false;
let recognition = null;
let currentView = 'timeline';
let currentMonth = new Date();
let selectedImage = null;

// Initialize
window.onload = function() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            initApp();
        }, 400);
    }, 1500);
};

function initApp() {
    renderTimeline();
    initSpeechRecognition();
    setupCalendar();
}

// View Management
function switchView(view) {
    currentView = view;
    
    // Update tabs
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.view === view) {
            tab.classList.add('active');
        }
    });
    
    // Show/hide containers
    document.getElementById('timelineView').classList.add('hidden');
    document.getElementById('calendarView').classList.add('hidden');
    document.getElementById('ticketsView').classList.add('hidden');
    
    document.getElementById(view + 'View').classList.remove('hidden');
    
    // Refresh content
    if (view === 'timeline') {
        renderTimeline();
    } else if (view === 'calendar') {
        renderCalendar();
    } else if (view === 'tickets') {
        renderTickets();
    }
}

// Timeline
function renderTimeline() {
    const container = document.getElementById('timelineContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Sort by time
    const sortedItems = [...items].sort((a, b) => a.time - b.time);
    
    if (sortedItems.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Group by date
    const grouped = groupByDate(sortedItems);
    
    container.innerHTML = Object.entries(grouped).map(([date, dateItems]) => `
        <div class="timeline-date">${date}</div>
        ${dateItems.map(item => renderItemCard(item)).join('')}
    `).join('');
}

function groupByDate(items) {
    const grouped = {};
    
    items.forEach(item => {
        const date = formatDateGroup(item.time);
        if (!grouped[date]) {
            grouped[date] = [];
        }
        grouped[date].push(item);
    });
    
    return grouped;
}

function formatDateGroup(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === now.toDateString()) {
        return '今天';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '明天';
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
    }
}

function renderItemCard(item) {
    const icons = {
        todo: '✓',
        event: '📅',
        ticket: '🎫',
        pickup: '📦',
        note: '📝'
    };
    
    const isTicket = item.type === 'ticket';
    const isPickup = item.type === 'pickup';
    
    if (isTicket) {
        return renderTicketCard(item);
    }
    
    if (isPickup) {
        return renderPickupCard(item);
    }
    
    return `
        <div class="timeline-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            <div class="card">
                <div class="card-icon ${item.type}">${icons[item.type] || '📝'}</div>
                <div class="card-content">
                    <div class="card-title">${escapeHtml(item.title)}</div>
                    <div class="card-subtitle">${escapeHtml(item.description || '')}</div>
                    <div class="card-time">${formatTime(item.time)}</div>
                    ${item.category ? `<span class="card-badge">${item.category}</span>` : ''}
                </div>
                <div class="card-actions">
                    ${!item.completed ? `
                        <button class="card-btn complete" onclick="completeItem(${item.id})" title="完成">✓</button>
                    ` : ''}
                    <button class="card-btn delete" onclick="deleteItem(${item.id})" title="删除">🗑</button>
                </div>
            </div>
        </div>
    `;
}

function renderTicketCard(item) {
    const ticketColors = {
        flight: 'linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)',
        train: 'linear-gradient(135deg, #FF9500 0%, #FF6B35 100%)',
        movie: 'linear-gradient(135deg, #AF52DE 0%, #FF2D55 100%)',
        concert: 'linear-gradient(135deg, #FF2D55 0%, #FF6B35 100%)'
    };
    
    const ticketNames = {
        flight: '✈️ 航班',
        train: '🚄 火车',
        movie: '🎬 电影',
        concert: '🎵 演唱会'
    };
    
    return `
        <div class="timeline-item" data-id="${item.id}" onclick="showTicketDetail(${item.id})">
            <div class="ticket-card" style="background: ${ticketColors[item.ticketType] || ticketColors.flight}">
                <div class="ticket-type">${ticketNames[item.ticketType] || '🎫 票务'}</div>
                <div class="ticket-title">${escapeHtml(item.title)}</div>
                <div class="ticket-info">${escapeHtml(item.description || '')}</div>
                <div class="ticket-barcode">
                    <div class="ticket-code">${item.ticketCode || '----'}</div>
                </div>
            </div>
        </div>
    `;
}

function renderPickupCard(item) {
    return `
        <div class="timeline-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
            <div class="pickup-card">
                <div class="pickup-header">
                    <div class="pickup-icon">📦</div>
                    <span class="pickup-title">${escapeHtml(item.title)}</span>
                </div>
                <div class="pickup-code-display">${item.pickupCode || '----'}</div>
                <div class="pickup-location">${escapeHtml(item.location || '取件地点未指定')}</div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    ${!item.completed ? `
                        <button class="btn btn-primary" style="flex: 1; padding: 10px;" onclick="event.stopPropagation(); completeItem(${item.id})">标记完成</button>
                    ` : ''}
                    <button class="btn btn-secondary" style="flex: 1; padding: 10px;" onclick="event.stopPropagation(); deleteItem(${item.id})">删除</button>
                </div>
            </div>
        </div>
    `;
}

// Tickets View
function renderTickets() {
    const container = document.getElementById('ticketsContainer');
    const emptyState = document.getElementById('emptyTickets');
    
    const tickets = items.filter(item => item.type === 'ticket' || item.type === 'pickup');
    
    if (tickets.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = tickets
        .sort((a, b) => a.time - b.time)
        .map(item => renderItemCard(item))
        .join('');
}

// Calendar
function setupCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    document.getElementById('calendarMonth').textContent = 
        `${year}年${month + 1}月`;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days = [];
    
    // Day headers
    const headers = ['日', '一', '二', '三', '四', '五', '六'];
    headers.forEach(h => {
        days.push(`<div class="calendar-day-header">${h}</div>`);
    });
    
    // Padding
    for (let i = 0; i < startPadding; i++) {
        days.push('<div></div>');
    }
    
    // Days
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const isToday = date.toDateString() === today.toDateString();
        const hasEvent = hasEventOnDate(date);
        
        days.push(`
            <div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}">
                <span class="calendar-day-number">${d}</span>
            </div>
        `);
    }
    
    document.getElementById('calendarGrid').innerHTML = days.join('');
}

function hasEventOnDate(date) {
    return items.some(item => {
        const itemDate = new Date(item.time);
        return itemDate.toDateString() === date.toDateString();
    });
}

function prevMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
}

function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
}

// FAB
function toggleFab() {
    const fab = document.getElementById('fab');
    const menu = document.getElementById('fabMenu');
    
    fab.classList.toggle('expanded');
    menu.classList.toggle('show');
}

// Modals
function showTextModal() {
    document.getElementById('textModal').classList.add('show');
    toggleFab();
}

function showVoiceModal() {
    document.getElementById('voiceModal').classList.add('show');
    toggleFab();
}

function showImageModal() {
    document.getElementById('imageModal').classList.add('show');
    toggleFab();
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

function closeModal(event, modalId) {
    if (event.target === event.currentTarget) {
        hideModal(modalId);
    }
}

// Text Input
async function pasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('textInput').value = text;
    } catch (err) {
        showToast('无法访问剪贴板');
    }
}

async function parseText() {
    const text = document.getElementById('textInput').value.trim();
    if (!text) {
        showToast('请输入内容');
        return;
    }
    
    hideModal('textModal');
    await parseWithAI(text, 'text');
}

// Voice
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('voiceHint').textContent = '正在聆听...';
            document.getElementById('voiceBtn').classList.add('recording');
        };
        
        recognition.onend = () => {
            isRecording = false;
            document.getElementById('voiceHint').textContent = '点击开始录音';
            document.getElementById('voiceBtn').classList.remove('recording');
        };
        
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            hideModal('voiceModal');
            parseWithAI(text, 'voice');
        };
        
        recognition.onerror = () => {
            showToast('语音识别失败，请重试');
            isRecording = false;
        };
    }
}

function toggleRecording() {
    if (!recognition) {
        showToast('您的浏览器不支持语音识别');
        return;
    }
    
    if (isRecording) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

// Image
function selectImage() {
    document.getElementById('imageInput').click();
}

function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    selectedImage = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.src = e.target.result;
        preview.classList.remove('hidden');
        document.getElementById('imageUploadArea').classList.add('hidden');
        document.getElementById('parseImageBtn').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

async function parseImage() {
    if (!selectedImage) return;
    
    showToast('图片识别功能需要后端支持，这里模拟识别结果');
    
    // Simulate ticket detection
    const mockResults = [
        {
            type: 'ticket',
            ticketType: 'flight',
            title: '北京 → 上海',
            description: '2026年2月15日 09:30 起飞',
            ticketCode: 'CA1234',
            time: new Date('2026-02-15T09:30:00').getTime()
        },
        {
            type: 'pickup',
            title: '快递取件',
            pickupCode: '8-3-9527',
            location: '菜鸟驿站',
            time: Date.now() + 24 * 60 * 60 * 1000
        }
    ];
    
    const result = mockResults[Math.floor(Math.random() * mockResults.length)];
    currentParsedResult = { ...result, id: Date.now() };
    
    hideModal('imageModal');
    showResultModal(currentParsedResult);
}

// AI Parsing
async function parseWithAI(text, inputType) {
    showToast('AI正在解析...');
    
    try {
        const response = await fetch(CONFIG.KIMI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.KIMI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'moonshot-v1-32k',
                messages: [
                    {
                        role: 'system',
                        content: `你是一个智能信息提取助手。从用户的输入中提取关键信息并以JSON格式返回。
                        
支持的类型：
1. todo - 待办事项
2. event - 日程事件
3. ticket - 票务（机票flight、火车票train、电影票movie、演唱会concert）
4. pickup - 取件码
5. note - 笔记

返回格式：
{
    "type": "todo|event|ticket|pickup|note",
    "title": "简短标题",
    "description": "详细描述",
    "time": "Unix时间戳毫秒",
    "category": "分类标签",
    "ticketType": "flight/train/movie/concert（仅票务）",
    "ticketCode": "票号（仅票务）",
    "pickupCode": "取件码（仅取件）",
    "location": "地点"
}

当前时间：${new Date().toISOString()}
只返回JSON，不要包含其他说明文字。`
                    },
                    {
                        role: 'user',
                        content: text
                    }
                ],
                temperature: 0.3
            })
        });
        
        const data = await response.json();
        const content = data.choices[0].message.content;
        
        let parsed;
        try {
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                              content.match(/```\n?([\s\S]*?)\n?```/) ||
                              [null, content];
            parsed = JSON.parse(jsonMatch[1] || content);
        } catch (e) {
            parsed = fallbackParse(text);
        }
        
        currentParsedResult = {
            ...parsed,
            id: Date.now(),
            originalText: text,
            inputType: inputType
        };
        
        showResultModal(currentParsedResult);
        
    } catch (error) {
        console.error('Parse error:', error);
        currentParsedResult = fallbackParse(text);
        showResultModal(currentParsedResult);
    }
}

function fallbackParse(text) {
    // Detect ticket patterns
    if (text.match(/航班|机票|flight/i)) {
        return {
            type: 'ticket',
            ticketType: 'flight',
            title: '航班信息',
            description: text.substring(0, 50),
            time: Date.now() + 24 * 60 * 60 * 1000,
            ticketCode: text.match(/[A-Z]{2}\d{3,4}/)?.[0] || ''
        };
    }
    
    if (text.match(/火车|高铁|动车|train/i)) {
        return {
            type: 'ticket',
            ticketType: 'train',
            title: '火车票',
            description: text.substring(0, 50),
            time: Date.now() + 24 * 60 * 60 * 1000
        };
    }
    
    if (text.match(/电影|movie|cinema/i)) {
        return {
            type: 'ticket',
            ticketType: 'movie',
            title: '电影票',
            description: text.substring(0, 50),
            time: Date.now() + 24 * 60 * 60 * 1000
        };
    }
    
    // Detect pickup code
    const pickupMatch = text.match(/(取件码|提取码|自提码)[：:]?\s*(\d+[-\s]?\d+[-\s]?\d+|\d{4,})/i) ||
                       text.match(/(\d{4,}[-\s]?\d{0,4})\s*.*?取件/);
    if (pickupMatch) {
        return {
            type: 'pickup',
            title: '快递取件',
            pickupCode: pickupMatch[2] || pickupMatch[1],
            location: text.match(/(菜鸟驿站|快递柜|便利店|超市)/)?.[0] || '取件点',
            time: Date.now() + 24 * 60 * 60 * 1000
        };
    }
    
    // Default todo
    return {
        type: 'todo',
        title: text.substring(0, 20),
        description: text,
        time: Date.now() + 24 * 60 * 60 * 1000,
        category: '生活'
    };
}

function showResultModal(result) {
    const typeNames = {
        todo: '待办事项',
        event: '日程事件',
        ticket: '票务',
        pickup: '取件码',
        note: '笔记'
    };
    
    const content = document.getElementById('resultContent');
    content.innerHTML = `
        <div class="result-item">
            <span class="result-label">类型</span>
            <span class="result-value">${typeNames[result.type] || result.type}</span>
        </div>
        <div class="result-item">
            <span class="result-label">标题</span>
            <span class="result-value">${escapeHtml(result.title)}</span>
        </div>
        ${result.description ? `
        <div class="result-item">
            <span class="result-label">描述</span>
            <span class="result-value">${escapeHtml(result.description)}</span>
        </div>
        ` : ''}
        <div class="result-item">
            <span class="result-label">时间</span>
            <span class="result-value">${formatTime(result.time)}</span>
        </div>
        ${result.ticketCode ? `
        <div class="result-item">
            <span class="result-label">票号</span>
            <span class="result-value">${result.ticketCode}</span>
        </div>
        ` : ''}
        ${result.pickupCode ? `
        <div class="result-item">
            <span class="result-label">取件码</span>
            <span class="result-value" style="font-size: 18px; font-weight: 700;">${result.pickupCode}</span>
        </div>
        ` : ''}
        ${result.location ? `
        <div class="result-item">
            <span class="result-label">地点</span>
            <span class="result-value">${escapeHtml(result.location)}</span>
        </div>
        ` : ''}
    `;
    
    document.getElementById('resultModal').classList.add('show');
}

function saveResult() {
    if (!currentParsedResult) return;
    
    items.push({
        ...currentParsedResult,
        completed: false,
        createdAt: Date.now()
    });
    
    saveItems();
    hideModal('resultModal');
    showToast('已保存');
    
    // Refresh current view
    if (currentView === 'timeline') {
        renderTimeline();
    } else if (currentView === 'tickets') {
        renderTickets();
    }
    
    // Reset
    document.getElementById('textInput').value = '';
    currentParsedResult = null;
}

// Item Actions
function completeItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        item.completed = true;
        item.completedAt = Date.now();
        saveItems();
        renderTimeline();
        showToast('已完成 ✓');
    }
}

function deleteItem(id) {
    if (confirm('确定要删除吗？')) {
        items = items.filter(i => i.id !== id);
        saveItems();
        
        if (currentView === 'timeline') {
            renderTimeline();
        } else if (currentView === 'tickets') {
            renderTickets();
        }
        
        showToast('已删除');
    }
}

function showTicketDetail(id) {
    const item = items.find(i => i.id === id);
    if (!item || item.type !== 'ticket') return;
    
    const ticketNames = {
        flight: '✈️ 航班',
        train: '🚄 火车',
        movie: '🎬 电影',
        concert: '🎵 演唱会'
    };
    
    document.getElementById('ticketDetailContent').innerHTML = `
        <div class="ticket-card" style="margin-bottom: 20px; background: linear-gradient(135deg, #5856D6 0%, #AF52DE 100%);">
            <div class="ticket-type">${ticketNames[item.ticketType] || '🎫 票务'}</div>
            <div class="ticket-title">${escapeHtml(item.title)}</div>
            <div class="ticket-info">${escapeHtml(item.description || '')}</div>
            <div class="ticket-barcode">
                <div class="ticket-code">${item.ticketCode || '----'}</div>
            </div>
        </div>
        <div class="result-content">
            <div class="result-item">
                <span class="result-label">时间</span>
                <span class="result-value">${formatTime(item.time)}</span>
            </div>
            ${item.location ? `
            <div class="result-item">
                <span class="result-label">地点</span>
                <span class="result-value">${escapeHtml(item.location)}</span>
            </div>
            ` : ''}
        </div>
        <div style="margin-top: 20px; display: flex; gap: 12px;">
            <button class="btn btn-secondary" onclick="hideModal('ticketModal')">关闭</button>
            <button class="btn btn-primary" onclick="deleteItem(${item.id}); hideModal('ticketModal');">删除</button>
        </div>
    `;
    
    document.getElementById('ticketModal').classList.add('show');
}

// Search
function toggleSearch() {
    const container = document.getElementById('searchContainer');
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        document.getElementById('searchInput').focus();
    }
}

function searchReminders(query) {
    if (!query) {
        renderTimeline();
        return;
    }
    
    const filtered = items.filter(item => 
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    );
    
    const container = document.getElementById('timelineContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (filtered.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        emptyState.querySelector('.empty-title').textContent = '未找到结果';
        return;
    }
    
    emptyState.classList.add('hidden');
    
    const grouped = groupByDate(filtered);
    container.innerHTML = Object.entries(grouped).map(([date, dateItems]) => `
        <div class="timeline-date">${date}</div>
        ${dateItems.map(item => renderItemCard(item)).join('')}
    `).join('');
}

// Stats
function showStats() {
    const today = new Date().toDateString();
    const todayItems = items.filter(i => new Date(i.time).toDateString() === today);
    
    document.getElementById('todayCount').textContent = todayItems.length;
    document.getElementById('completedToday').textContent = todayItems.filter(i => i.completed).length;
    document.getElementById('pendingCount').textContent = items.filter(i => !i.completed).length;
    document.getElementById('ticketCount').textContent = items.filter(i => i.type === 'ticket').length;
    
    // Type stats
    const types = {};
    items.forEach(i => {
        types[i.type] = (types[i.type] || 0) + 1;
    });
    
    const typeNames = {
        todo: '待办',
        event: '日程',
        ticket: '票务',
        pickup: '取件',
        note: '笔记'
    };
    
    document.getElementById('typeStats').innerHTML = Object.entries(types).map(([type, count]) => `
        <div class="settings-item">
            <span class="settings-label">${typeNames[type] || type}</span>
            <span style="color: var(--text-secondary);">${count}</span>
        </div>
    `).join('');
    
    document.getElementById('statsModal').classList.add('show');
}

// Utilities
function saveItems() {
    localStorage.setItem('minder_items', JSON.stringify(items));
}

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    if (date.toDateString() === now.toDateString()) {
        return '今天 ' + timeStr;
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '明天 ' + timeStr;
    } else {
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) + ' ' + timeStr;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

// PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration failed');
    });
}

// Notifications
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}
