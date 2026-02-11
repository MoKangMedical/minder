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
    // Simulate loading progress
    let progress = 0;
    const loadingInterval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            
            setTimeout(() => {
                document.getElementById('loadingScreen').style.opacity = '0';
                setTimeout(() => {
                    document.getElementById('loadingScreen').classList.add('hidden');
                    document.getElementById('app').classList.remove('hidden');
                    initApp();
                    
                    // Welcome animation for first visit
                    if (items.length === 0) {
                        setTimeout(() => {
                            showToast('👋 欢迎使用念念！点击右下角添加任务');
                        }, 500);
                    }
                }, 400);
            }, 500);
        }
    }, 100);
};

function initApp() {
    renderTimeline();
    initSpeechRecognition();
    setupCalendar();
}

// Soul Moment - 心灵时刻
let selectedMood = null;

function showSoulMoment() {
    document.getElementById('soulModal').classList.add('show');
    toggleFab();
    
    // Reset mood selection
    selectedMood = null;
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.style.borderColor = 'transparent';
        btn.style.transform = 'scale(1)';
    });
}

function selectMood(mood) {
    selectedMood = mood;
    
    // Reset all buttons
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.style.borderColor = 'transparent';
        btn.style.transform = 'scale(1)';
    });
    
    // Highlight selected
    const selectedBtn = document.querySelector(`[data-mood="${mood}"]`);
    if (selectedBtn) {
        selectedBtn.style.borderColor = '#E0C3FC';
        selectedBtn.style.transform = 'scale(1.15)';
        selectedBtn.style.boxShadow = '0 4px 20px rgba(224,195,252,0.4)';
    }
    
    // Haptic feedback
    hapticFeedback('light');
}

function saveSoulMoment() {
    const text = document.getElementById('soulInput').value.trim();
    
    if (!text && !selectedMood) {
        showToast('请选择心情或写下你的想法 💭');
        return;
    }
    
    const moodEmojis = {
        peaceful: '😌',
        happy: '😊',
        excited: '✨',
        grateful: '🙏',
        thoughtful: '🤔'
    };
    
    const moodNames = {
        peaceful: '平静',
        happy: '愉悦',
        excited: '兴奋',
        grateful: '感恩',
        thoughtful: '深思'
    };
    
    const soulItem = {
        id: Date.now(),
        type: 'note',
        title: selectedMood ? `${moodEmojis[selectedMood]} ${moodNames[selectedMood]}时刻` : '💭 心灵随想',
        description: text || '此刻的心情，无需言语',
        time: Date.now(),
        category: '心灵',
        completed: false,
        createdAt: Date.now(),
        isSoulMoment: true,
        mood: selectedMood
    };
    
    items.push(soulItem);
    saveItems();
    hideModal('soulModal');
    
    // Show special soul celebration
    createSoulConfetti();
    showSoulToast('珍藏成功', '这份感动，已被永恒铭记 ✨');
    
    // Refresh view
    if (currentView === 'timeline') {
        renderTimeline();
        setTimeout(() => {
            const newItem = document.querySelector(`[data-id="${soulItem.id}"]`);
            if (newItem) {
                newItem.classList.add('new');
                newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    }
    
    // Reset
    document.getElementById('soulInput').value = '';
    selectedMood = null;
    document.querySelectorAll('.mood-btn').forEach(btn => {
        btn.style.borderColor = 'transparent';
        btn.style.transform = 'scale(1)';
        btn.style.boxShadow = '';
    });
}

// Special soul confetti - more ethereal
function createSoulConfetti() {
    const colors = ['#E0C3FC', '#8EC5FC', '#FFD1FF', '#A8EDEA', '#FED6E3', '#D299C2'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    for (let i = 0; i < 30; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.width = (Math.random() * 8 + 4) + 'px';
        confetti.style.height = (Math.random() * 8 + 4) + 'px';
        confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        confetti.style.opacity = '0.8';
        container.appendChild(confetti);
    }
    
    setTimeout(() => container.remove(), 3500);
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
    
    const newItem = {
        ...currentParsedResult,
        completed: false,
        createdAt: Date.now()
    };
    
    items.push(newItem);
    saveItems();
    hideModal('resultModal');
    
    // Refresh current view with animation
    if (currentView === 'timeline') {
        renderTimeline();
        // Add animation to the new item
        setTimeout(() => {
            const newItemElement = document.querySelector(`[data-id="${newItem.id}"]`);
            if (newItemElement) {
                newItemElement.classList.add('new');
                newItemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100);
    } else if (currentView === 'tickets') {
        renderTickets();
    }
    
    // Show celebration for first task
    if (items.length === 1) {
        showAchievement('欢迎!', '添加了第一个任务，开始你的效率之旅!', '🎉');
    } else {
        showToast('已保存 ✨');
    }
    
    // Reset
    document.getElementById('textInput').value = '';
    currentParsedResult = null;
}

// Celebration Effects
function createConfetti() {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#FFD93D', '#FF6B9D', '#C44569'];
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    // Create 50 confetti pieces
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        
        // Random shape
        const shapes = ['square', 'circle', 'triangle'];
        confetti.classList.add(shapes[Math.floor(Math.random() * shapes.length)]);
        
        // Random position
        confetti.style.left = Math.random() * 100 + '%';
        
        // Random color
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        if (confetti.classList.contains('triangle')) {
            confetti.style.borderBottomColor = colors[Math.floor(Math.random() * colors.length)];
        }
        
        // Random animation duration and delay
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = Math.random() * 0.5 + 's';
        
        // Random rotation
        confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
        
        container.appendChild(confetti);
    }
    
    // Remove after animation
    setTimeout(() => {
        container.remove();
    }, 3500);
}

function showCheckmarkCelebration() {
    const checkmark = document.createElement('div');
    checkmark.className = 'checkmark-celebration';
    document.body.appendChild(checkmark);
    
    setTimeout(() => {
        checkmark.remove();
    }, 1500);
}

function showStreakCounter(count) {
    const streak = document.createElement('div');
    streak.className = 'streak-counter';
    streak.innerHTML = `
        <div class="streak-text">
            <span>连续完成</span>
            <span class="streak-number">${count}</span>
            <span>个任务!</span>
        </div>
    `;
    document.body.appendChild(streak);
    
    setTimeout(() => {
        streak.remove();
    }, 2000);
}

function showAchievement(title, description, icon = '🏆') {
    const achievement = document.createElement('div');
    achievement.className = 'achievement-popup';
    achievement.innerHTML = `
        <div class="achievement-icon">${icon}</div>
        <div class="achievement-text">
            <div class="achievement-title">${title}</div>
            <div class="achievement-desc">${description}</div>
        </div>
    `;
    document.body.appendChild(achievement);
    
    setTimeout(() => {
        achievement.remove();
    }, 4000);
}

// Calculate today's completed streak
function getTodayStreak() {
    const today = new Date().toDateString();
    const todayItems = items.filter(i => {
        if (!i.completed || !i.completedAt) return false;
        return new Date(i.completedAt).toDateString() === today;
    });
    return todayItems.length;
}

// Check for achievements
function checkAchievements() {
    const totalCompleted = items.filter(i => i.completed).length;
    const todayStreak = getTodayStreak();
    
    // First task achievement
    if (totalCompleted === 1) {
        showAchievement('初次完成!', '完成了第一个任务，继续保持!', '🌟');
    }
    // 5 tasks milestone
    else if (totalCompleted === 5) {
        showAchievement('里程碑!', '已完成5个任务，效率惊人!', '🚀');
    }
    // 10 tasks milestone
    else if (totalCompleted === 10) {
        showAchievement('任务达人!', '已完成10个任务，太棒了!', '💎');
    }
    // Daily streaks
    else if (todayStreak === 3) {
        showAchievement('三连击!', '今天已完成3个任务!', '🔥');
    }
    else if (todayStreak === 5) {
        showAchievement('效率之王!', '今天已完成5个任务!', '👑');
    }
    else if (todayStreak === 10) {
        showAchievement('今日完美!', '已完成10个任务，不可思议!', '🌈');
    }
}

// Item Actions
function completeItem(id) {
    const item = items.find(i => i.id === id);
    if (item) {
        // Add completing animation class
        const itemElement = document.querySelector(`[data-id="${id}"]`);
        if (itemElement) {
            itemElement.classList.add('completing');
        }
        
        // Wait for animation then complete
        setTimeout(() => {
            item.completed = true;
            item.completedAt = Date.now();
            saveItems();
            
            // Trigger celebration effects
            createConfetti();
            showCheckmarkCelebration();
            
            // Show streak if multiple completed today
            const todayStreak = getTodayStreak();
            if (todayStreak > 1 && todayStreak % 3 === 0) {
                showStreakCounter(todayStreak);
            }
            
            // Check for achievements
            checkAchievements();
            
            // Refresh view
            renderTimeline();
            showToast('已完成 ✨');
        }, 300);
    }
}

// Ripple effect for buttons
function createRipple(e, button) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = e.clientX - rect.left - size / 2 + 'px';
    ripple.style.top = e.clientY - rect.top - size / 2 + 'px';
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// Add ripple to all buttons
document.addEventListener('click', function(e) {
    const button = e.target.closest('button');
    if (button && !button.classList.contains('no-ripple')) {
        createRipple(e, button);
    }
});

function deleteItem(id) {
    // Add deleting animation
    const itemElement = document.querySelector(`[data-id="${id}"]`);
    if (itemElement) {
        itemElement.classList.add('deleting');
        
        // Wait for animation then delete
        setTimeout(() => {
            items = items.filter(i => i.id !== id);
            saveItems();
            
            if (currentView === 'timeline') {
                renderTimeline();
            } else if (currentView === 'tickets') {
                renderTickets();
            }
            
            showToast('已删除');
        }, 300);
    } else {
        // Fallback if element not found
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

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape to close modals
    if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        modals.forEach(modal => modal.classList.remove('show'));
    }
    
    // Ctrl/Cmd + N for new task
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        showTextModal();
    }
    
    // Ctrl/Cmd + F for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        toggleSearch();
    }
    
    // Ctrl/Cmd + 1/2/3 for view switching
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '3') {
        e.preventDefault();
        const views = ['timeline', 'calendar', 'tickets'];
        const viewIndex = parseInt(e.key) - 1;
        if (views[viewIndex]) {
            switchView(views[viewIndex]);
        }
    }
});

// ============ 蝴蝶魔法粒子效果 ============

// 在蝴蝶周围生成魔法粒子
function createButterflyMagic() {
    const butterfly = document.querySelector('.butterfly-container');
    if (!butterfly) return;
    
    setInterval(() => {
        if (Math.random() > 0.7) { // 30% 概率生成
            const particle = document.createElement('div');
            particle.className = 'magic-particle';
            
            const size = Math.random() * 6 + 2;
            const colors = ['#E0C3FC', '#8EC5FC', '#FFD1FF', '#A8EDEA', '#FED6E3'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            // 随机位置（围绕蝴蝶）
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 60 + 40;
            const startX = Math.cos(angle) * distance;
            const startY = Math.sin(angle) * distance;
            
            particle.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                left: 50%;
                top: 50%;
                margin-left: ${startX}px;
                margin-top: ${startY}px;
                box-shadow: 0 0 10px ${color};
                pointer-events: none;
                z-index: 5;
            `;
            
            // 设置CSS变量用于动画
            const endX = (Math.random() - 0.5) * 100;
            const endY = -Math.random() * 80 - 20;
            particle.style.setProperty('--tx', endX + 'px');
            particle.style.setProperty('--ty', endY + 'px');
            
            butterfly.appendChild(particle);
            
            // 触发动画
            requestAnimationFrame(() => {
                particle.style.animation = 'particleFloat 3s ease-out forwards';
            });
            
            // 清理
            setTimeout(() => particle.remove(), 3000);
        }
    }, 200);
}

// 页面加载后启动蝴蝶魔法
setTimeout(createButterflyMagic, 1000);

// ============ 心灵感动互动效果 ============

// 1. 触摸涟漪效果 - 心灵波动
document.addEventListener('click', function(e) {
    createSoulRipple(e.clientX, e.clientY);
});

function createSoulRipple(x, y) {
    const ripple = document.createElement('div');
    ripple.className = 'soul-ripple';
    ripple.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 20px;
        height: 20px;
        background: radial-gradient(circle, rgba(224,195,252,0.6) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9999;
        transform: translate(-50%, -50%);
        animation: soulRippleExpand 1s ease-out forwards;
    `;
    document.body.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 1000);
}

// 添加涟漪动画到CSS
const soulRippleStyle = document.createElement('style');
soulRippleStyle.textContent = `
    @keyframes soulRippleExpand {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        100% { transform: translate(-50%, -50%) scale(8); opacity: 0; }
    }
`;
document.head.appendChild(soulRippleStyle);

// 2. 鼠标跟随光点 - 心灵之光
document.addEventListener('mousemove', function(e) {
    if (Math.random() > 0.9) { // 随机生成，不要太频繁
        createSoulLight(e.clientX, e.clientY);
    }
});

function createSoulLight(x, y) {
    const light = document.createElement('div');
    light.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: 6px;
        height: 6px;
        background: radial-gradient(circle, #E0C3FC 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        animation: soulLightFloat 1.5s ease-out forwards;
    `;
    document.body.appendChild(light);
    
    setTimeout(() => light.remove(), 1500);
}

const soulLightStyle = document.createElement('style');
soulLightStyle.textContent = `
    @keyframes soulLightFloat {
        0% { transform: translate(0, 0) scale(1); opacity: 0.8; }
        100% { transform: translate(${Math.random() * 40 - 20}px, -50px) scale(0); opacity: 0; }
    }
`;
document.head.appendChild(soulLightStyle);

// 3. 每日心灵问候
function showSoulGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    let subtext = '';
    
    if (hour < 6) {
        greeting = '夜深人静，万物安眠';
        subtext = '愿你的梦境如极光般绚烂';
    } else if (hour < 9) {
        greeting = '晨光熹微，新的一天';
        subtext = '愿你今天的每一步都充满意义';
    } else if (hour < 12) {
        greeting = '上午好，追梦人';
        subtext = '每一个念头，都是未来的种子';
    } else if (hour < 14) {
        greeting = '午安，小憩片刻';
        subtext = '在忙碌中，别忘了善待自己';
    } else if (hour < 17) {
        greeting = '下午好，继续前行';
        subtext = '你的每一份努力，时光都看得见';
    } else if (hour < 20) {
        greeting = '黄昏时分，思绪万千';
        subtext = '捕捉此刻的想法，让美好有迹可循';
    } else if (hour < 22) {
        greeting = '夜幕降临，心灵归处';
        subtext = '回顾今天，感恩每一刻的遇见';
    } else {
        greeting = '夜色温柔，星辰相伴';
        subtext = '愿你的明天，比今天更加精彩';
    }
    
    // 显示问候
    showSoulToast(greeting, subtext);
}

// 心灵感动Toast
function showSoulToast(title, subtitle) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(20px);
        padding: 20px 32px;
        border-radius: 24px;
        text-align: center;
        z-index: 10000;
        box-shadow: 0 8px 32px rgba(224,195,252,0.3);
        border: 1px solid rgba(255,255,255,0.8);
        animation: soulToastIn 0.6s ease forwards;
    `;
    toast.innerHTML = `
        <div style="font-size: 16px; font-weight: 500; color: #4A4A6A; margin-bottom: 6px;">${title}</div>
        <div style="font-size: 13px; color: #9B8AA5;">${subtitle}</div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'soulToastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

const soulToastStyle = document.createElement('style');
soulToastStyle.textContent = `
    @keyframes soulToastIn {
        0% { transform: translateX(-50%) translateY(-30px); opacity: 0; }
        100% { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes soulToastOut {
        0% { transform: translateX(-50%) translateY(0); opacity: 1; }
        100% { transform: translateX(-50%) translateY(-20px); opacity: 0; }
    }
`;
document.head.appendChild(soulToastStyle);

// 页面加载后显示问候
setTimeout(showSoulGreeting, 2000);

// 4. 滚动视差效果 - 梦境流动
let lastScrollY = 0;
document.addEventListener('scroll', function() {
    const scrollY = window.scrollY;
    const diff = scrollY - lastScrollY;
    
    // 为背景添加微妙的视差
    document.body.style.backgroundPosition = `0 ${scrollY * 0.1}px`;
    
    lastScrollY = scrollY;
}, { passive: true });

// 5. 卡片悬停心灵感应
document.addEventListener('mouseover', function(e) {
    const card = e.target.closest('.timeline-item');
    if (card && !card.classList.contains('soul-active')) {
        card.classList.add('soul-active');
        
        // 添加微妙的光晕
        card.style.boxShadow = '0 12px 40px rgba(224,195,252,0.25)';
        
        setTimeout(() => {
            card.classList.remove('soul-active');
            card.style.boxShadow = '';
        }, 300);
    }
});

// Add haptic feedback for mobile (if supported)
function hapticFeedback(type = 'light') {
    if ('vibrate' in navigator) {
        const patterns = {
            light: 10,
            medium: 20,
            heavy: 30,
            success: [10, 50, 10],
            error: [30, 100, 30]
        };
        navigator.vibrate(patterns[type] || 10);
    }
}

// Touch gesture support
let touchStartX = 0;
let touchStartY = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener('touchend', function(e) {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // Swipe left/right to switch views (if horizontal swipe is dominant)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const views = ['timeline', 'calendar', 'tickets'];
        const currentIndex = views.indexOf(currentView);
        
        if (deltaX < 0 && currentIndex < views.length - 1) {
            // Swipe left - next view
            switchView(views[currentIndex + 1]);
        } else if (deltaX > 0 && currentIndex > 0) {
            // Swipe right - previous view
            switchView(views[currentIndex - 1]);
        }
    }
}, { passive: true });

// Export functions for testing
window.MinderApp = {
    items,
    createConfetti,
    showCheckmarkCelebration,
    showStreakCounter,
    showAchievement,
    hapticFeedback
};
