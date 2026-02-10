// 念念 (Minder) - Web App
// 你的第二记忆

const CONFIG = {
    KIMI_API_KEY: 'sk-JRT2t7Pnqq7Cm2wh6nw1G2QcK9OxNBAFujR3zhD2GzqkbFbz',
    KIMI_API_URL: 'https://api.moonshot.cn/v1/chat/completions',
    APP_NAME: '念念',
    APP_VERSION: '1.0.0'
};

// State
let reminders = JSON.parse(localStorage.getItem('minder_reminders') || '[]');
let currentParsedResult = null;
let isRecording = false;
let recognition = null;

// Initialize
window.onload = function() {
    setTimeout(() => {
        document.getElementById('loadingScreen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
            document.getElementById('app').classList.remove('hidden');
            initApp();
        }, 500);
    }, 1500);
};

function initApp() {
    updateGreeting();
    renderReminders();
    updateStats();
    setupEventListeners();
    initSpeechRecognition();
}

// Greeting
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '早安 ☀️';
    let subtitle = '雪梨会一直陪着你的';
    
    if (hour < 6 || hour >= 23) {
        greeting = '夜深了 💤';
        subtitle = '早点休息，明天见';
    } else if (hour < 12) {
        greeting = '早安 ☀️';
        subtitle = '今天也是美好的一天';
    } else if (hour < 18) {
        greeting = '下午好 💪';
        subtitle = '继续加油';
    } else {
        greeting = '晚上好 🌙';
        subtitle = '记得休息';
    }
    
    document.getElementById('greetingText').textContent = greeting;
    document.getElementById('subtitleText').textContent = subtitle;
}

// Render Reminders
function renderReminders(filter = 'all') {
    const container = document.getElementById('remindersList');
    const emptyState = document.getElementById('emptyState');
    
    let filteredReminders = reminders;
    if (filter === 'active') {
        filteredReminders = reminders.filter(r => !r.completed);
    } else if (filter === 'completed') {
        filteredReminders = reminders.filter(r => r.completed);
    }
    
    // Sort by time
    filteredReminders.sort((a, b) => a.time - b.time);
    
    if (filteredReminders.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.innerHTML = filteredReminders.map(reminder => `
        <div class="reminder-item ${reminder.completed ? 'completed' : ''}" data-id="${reminder.id}">
            <div class="reminder-content">
                <div class="reminder-title">${escapeHtml(reminder.title)}</div>
                <div class="reminder-time">${formatTime(reminder.time)}</div>
                <span class="reminder-category category-${reminder.category}">${reminder.category}</span>
            </div>
            <div class="reminder-actions">
                ${!reminder.completed ? `
                    <button class="btn-complete" onclick="completeReminder(${reminder.id})" title="完成">✓</button>
                ` : ''}
                <button class="btn-delete" onclick="deleteReminder(${reminder.id})" title="删除">🗑</button>
            </div>
        </div>
    `).join('');
}

// Update Stats
function updateStats() {
    const active = reminders.filter(r => !r.completed).length;
    const completed = reminders.filter(r => r.completed).length;
    
    document.getElementById('activeCount').textContent = active;
    document.getElementById('completedCount').textContent = completed;
    document.getElementById('totalCount').textContent = reminders.length;
    document.getElementById('completionRate').textContent = 
        reminders.length > 0 ? Math.round((completed / reminders.length) * 100) + '%' : '0%';
    
    // Today's completed
    const today = new Date().toDateString();
    const todayCompleted = reminders.filter(r => {
        if (!r.completed || !r.completedAt) return false;
        return new Date(r.completedAt).toDateString() === today;
    }).length;
    document.getElementById('todayCount').textContent = todayCompleted;
}

// Event Listeners
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderReminders(btn.dataset.filter);
        });
    });
}

// Speech Recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-CN';
        recognition.continuous = false;
        recognition.interimResults = false;
        
        recognition.onstart = () => {
            isRecording = true;
            document.getElementById('recordHint').textContent = '正在聆听...';
            document.querySelector('.waveform').style.display = 'flex';
        };
        
        recognition.onend = () => {
            isRecording = false;
            document.querySelector('.waveform').style.display = 'none';
        };
        
        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            parseVoiceText(text);
        };
        
        recognition.onerror = (event) => {
            showToast('语音识别失败，请重试');
            isRecording = false;
        };
    }
}

// Recording Functions
function startRecording() {
    document.getElementById('recordModal').classList.remove('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('recordBtnLarge').classList.remove('hidden');
    currentParsedResult = null;
}

function closeRecordModal() {
    if (isRecording && recognition) {
        recognition.stop();
    }
    document.getElementById('recordModal').classList.add('hidden');
}

function startRecordingVoice() {
    if (!recognition) {
        // Fallback: show text input
        const text = prompt('请输入你的念想：');
        if (text) {
            parseVoiceText(text);
        }
        return;
    }
    
    try {
        recognition.start();
    } catch (e) {
        showToast('请允许麦克风权限');
    }
}

function stopRecordingVoice() {
    if (recognition && isRecording) {
        recognition.stop();
    }
}

function cancelRecording() {
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('recordBtnLarge').classList.remove('hidden');
    currentParsedResult = null;
}

// AI Parsing with Kimi
async function parseVoiceText(text) {
    document.getElementById('recordBtnLarge').classList.add('hidden');
    document.getElementById('recordHint').textContent = '我在理解你的念想...';
    document.querySelector('.waveform').style.display = 'flex';
    
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
                        content: `你是一个智能念想解析助手。请从用户的输入中提取以下信息并以JSON格式返回：
                        {
                            "title": "念想的简短标题（不超过10个字）",
                            "time": "具体的提醒时间（Unix时间戳毫秒）",
                            "category": "分类：亲情、工作、学习、生活、健康中的一个",
                            "priority": 优先级数字（0=低，1=中，2=高）
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
        
        // Parse JSON from response
        let parsed;
        try {
            // Try to extract JSON if wrapped in code blocks
            const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                              content.match(/```\n?([\s\S]*?)\n?```/) ||
                              [null, content];
            parsed = JSON.parse(jsonMatch[1] || content);
        } catch (e) {
            // Fallback parsing
            parsed = fallbackParse(text);
        }
        
        currentParsedResult = {
            title: parsed.title || text.substring(0, 20),
            time: parsed.time || getDefaultTime(),
            category: parsed.category || '生活',
            priority: parsed.priority || 1,
            originalText: text,
            id: Date.now()
        };
        
        showResultCard(currentParsedResult);
        
    } catch (error) {
        console.error('Parse error:', error);
        // Fallback
        currentParsedResult = fallbackParse(text);
        showResultCard(currentParsedResult);
    }
}

function fallbackParse(text) {
    // Simple rule-based parsing
    let time = getDefaultTime();
    let category = '生活';
    
    // Time parsing
    if (text.includes('明天')) {
        time = Date.now() + 24 * 60 * 60 * 1000;
    } else if (text.includes('今天')) {
        time = Date.now();
    }
    
    // Category detection
    if (text.includes('妈妈') || text.includes('爸爸') || text.includes('家人')) {
        category = '亲情';
    } else if (text.includes('工作') || text.includes('会议') || text.includes('项目')) {
        category = '工作';
    } else if (text.includes('学习') || text.includes('看书') || text.includes('课程')) {
        category = '学习';
    } else if (text.includes('健身') || text.includes('运动') || text.includes('喝水')) {
        category = '健康';
    }
    
    return {
        title: text.substring(0, 20),
        time: time,
        category: category,
        priority: 1,
        originalText: text,
        id: Date.now()
    };
}

function getDefaultTime() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow.getTime();
}

function showResultCard(result) {
    document.querySelector('.waveform').style.display = 'none';
    document.getElementById('resultTitle').textContent = result.title;
    document.getElementById('resultTime').textContent = formatTime(result.time);
    document.getElementById('resultCategory').textContent = result.category;
    document.getElementById('resultCategory').className = `result-category category-${result.category}`;
    
    document.getElementById('resultCard').classList.remove('hidden');
}

function saveReminder() {
    if (!currentParsedResult) return;
    
    reminders.push({
        ...currentParsedResult,
        completed: false,
        createdAt: Date.now()
    });
    
    saveReminders();
    renderReminders();
    updateStats();
    closeRecordModal();
    showToast('✨ 我会帮你记住这个念想');
    
    // Schedule notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
        scheduleNotification(currentParsedResult);
    }
}

// Complete Reminder
function completeReminder(id) {
    const reminder = reminders.find(r => r.id === id);
    if (reminder) {
        reminder.completed = true;
        reminder.completedAt = Date.now();
        saveReminders();
        renderReminders();
        updateStats();
        showCard(reminder);
    }
}

// Delete Reminder
function deleteReminder(id) {
    if (confirm('确定要删除这个念想吗？')) {
        reminders = reminders.filter(r => r.id !== id);
        saveReminders();
        renderReminders();
        updateStats();
        showToast('念想已删除');
    }
}

// Show Completion Card
function showCard(reminder) {
    document.getElementById('cardTitle').textContent = reminder.title;
    document.getElementById('cardDate').textContent = 
        '完成于 ' + new Date().toLocaleDateString('zh-CN');
    document.getElementById('cardModal').classList.remove('hidden');
}

function closeCardModal() {
    document.getElementById('cardModal').classList.add('hidden');
}

function shareCard() {
    if (navigator.share) {
        navigator.share({
            title: '念念 - 你的第二记忆',
            text: `用念念完成了一个念想，分享给你~`,
            url: window.location.href
        });
    } else {
        showToast('分享功能需要HTTPS环境');
    }
}

// Stats Modal
function showStats() {
    document.getElementById('statsModal').classList.remove('hidden');
    renderCategoryStats();
}

function closeStatsModal() {
    document.getElementById('statsModal').classList.add('hidden');
}

function renderCategoryStats() {
    const categories = ['亲情', '工作', '学习', '生活', '健康'];
    const categoryColors = {
        '亲情': '#FFB6C1',
        '工作': '#4A90E2',
        '学习': '#9B59B6',
        '生活': '#FF6B35',
        '健康': '#7ED321'
    };
    
    const stats = {};
    categories.forEach(c => stats[c] = 0);
    reminders.filter(r => r.completed).forEach(r => {
        if (stats[r.category] !== undefined) {
            stats[r.category]++;
        }
    });
    
    const max = Math.max(...Object.values(stats), 1);
    
    document.getElementById('categoryStats').innerHTML = categories.map(cat => `
        <div class="category-item">
            <span class="category-name">${cat}</span>
            <div class="category-bar">
                <div class="category-progress" style="width: ${(stats[cat] / max) * 100}%; background: ${categoryColors[cat]}"></div>
            </div>
            <span class="category-count">${stats[cat]}</span>
        </div>
    `).join('');
}

// Utilities
function saveReminders() {
    localStorage.setItem('minder_reminders', JSON.stringify(reminders));
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
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Notification Support
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}

function scheduleNotification(reminder) {
    const now = Date.now();
    const delay = reminder.time - now;
    
    if (delay > 0 && delay < 86400000) { // Within 24 hours
        setTimeout(() => {
            new Notification('念念', {
                body: `你的念想到时间了：${reminder.title}`,
                icon: 'assets/icon-192.png'
            });
        }, delay);
    }
}

// Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => {
        console.log('SW registration failed');
    });
}