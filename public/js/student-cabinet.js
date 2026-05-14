// public/js/student-cabinet.js

document.addEventListener('DOMContentLoaded', () => {
    // STUDENT_ID приходить з EJS шаблону
    if (typeof STUDENT_ID !== 'undefined') {
        loadCabinetData(STUDENT_ID);
    }
});

/**
 * ГОЛОВНА ФУНКЦІЯ ЗАВАНТАЖЕННЯ
 */
async function loadCabinetData(id) {
    try {
        const response = await fetch(`/api/student/${id}/history`);
        const results = await response.json();

        if (results && results.length > 0) {
            const userStats = processData(results);
            
            updateHeaderStats(userStats);
            renderSubjectCards(results); // Нові картки предметів
            renderHistoryTable(results); // Нова таблиця
            renderWeakTopics(userStats);
            initProgressChart(userStats);
        } else {
            document.querySelector('.cabinet-main').innerHTML = `
                <div style="text-align:center; padding: 50px;">
                    <h3>Ви ще не пройшли жодного тесту.</h3>
                    <a href="/api/tests" class="btn-primary" style="text-decoration:none;">Перейти до тестів</a>
                </div>`;
        }
    } catch (error) {
        console.error('Помилка завантаження даних:', error);
    }
}

/**
 * ОБРОБКА ДАНИХ (Розрахунок статистики)
 */
function processData(results) {
    let totalScoreSum = 0;
    const topicsMap = {};

    const testHistory = results.map(res => {
        const percent = Math.round((res.score / res.total_questions) * 100);
        totalScoreSum += percent;

        // Логіка для слабких тем (якщо бал < 70)
        if (percent < 70) {
            topicsMap[res.subject] = (topicsMap[res.subject] || 0) + 1;
        }

        return {
            ...res,
            percent: percent
        };
    });

    return {
        totalTests: results.length,
        avgScore: Math.round(totalScoreSum / results.length),
        testHistory: testHistory,
        weakTopics: topicsMap
    };
}

/**
 * ОНОВЛЕННЯ ВЕРХНЬОЇ ПАНЕЛІ (Hero)
 */
function updateHeaderStats(stats) {
    document.getElementById('totalTests').textContent = stats.totalTests;
    document.getElementById('avgScore').textContent = `${stats.avgScore}%`;

    const badge = document.getElementById('achievementLevel');
    if (stats.avgScore >= 90) badge.textContent = "Майстер";
    else if (stats.avgScore >= 70) badge.textContent = "Просунутий";
    else badge.textContent = "Початківець";
}

/**
 * РЕНДЕР КАРТОК ПРЕДМЕТІВ (Як на скріншоті)
 */
function renderSubjectCards(results) {
    const grid = document.getElementById('subjectsGrid');
    
    // Групуємо результати за назвою предмета
    const subjectStats = results.reduce((acc, res) => {
        if (!acc[res.subject]) {
            acc[res.subject] = { scores: [], count: 0, lastDate: res.completed_at };
        }
        acc[res.subject].scores.push((res.score / res.total_questions) * 100);
        acc[res.subject].count++;
        // Оновлюємо дату, якщо цей тест був пізніше
        if (new Date(res.completed_at) > new Date(acc[res.subject].lastDate)) {
            acc[res.subject].lastDate = res.completed_at;
        }
        return acc;
    }, {});

    grid.innerHTML = Object.keys(subjectStats).map(subject => {
        const data = subjectStats[subject];
        const avg = Math.round(data.scores.reduce((a, b) => a + b, 0) / data.count);
        
        return `
            <div class="subject-card" style="background: white; padding: 1.5rem; border-radius: 12px; border: 1px solid #edf2f7; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #1e293b; font-weight:600;">${subject}</h3>
                    <span style="font-weight: 700; color: #4A90E2; font-size: 1.2rem;">${avg}%</span>
                </div>
                <div style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #64748b; margin-bottom: 0.5rem;">
                        <span>Прогрес</span>
                        <span>${avg}%</span>
                    </div>
                    <div style="width: 100%; height: 8px; background: #f1f5f9; border-radius: 10px; overflow: hidden;">
                        <div style="width: ${avg}%; height: 100%; background: #4A90E2; transition: width 1s ease-in-out;"></div>
                    </div>
                </div>
                <div style="display: flex; gap: 1rem; font-size: 0.85rem; color: #94a3b8;">
                    <span>📝 ${data.count} тестів</span>
                    <span>🕒 ${timeAgo(data.lastDate)}</span>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * РЕНДЕР ТАБЛИЦІ ІСТОРІЇ
 */
function renderHistoryTable(results) {
    const tbody = document.getElementById('historyTableBody');
    if (!tbody) return;

    tbody.innerHTML = results.slice(0, 10).map(res => {
        const percent = Math.round((res.score / res.total_questions) * 100);
        const date = new Date(res.completed_at).toLocaleDateString('uk-UA');
        
        return `
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 1.2rem; color: #64748B;">${date}</td>
                <td style="padding: 1.2rem; font-weight: 500; color: #1e293b;">${res.subject}</td>
                <td style="padding: 1.2rem; color: #1e293b;">${res.title}</td>
                <td style="padding: 1.2rem; text-align: center;">
                    <span style="background: ${percent < 60 ? '#FFF5F5' : '#F0FFF4'}; 
                                 color: ${percent < 60 ? '#E53E3E' : '#38A169'}; 
                                 padding: 6px 14px; border-radius: 20px; font-weight: 700; font-size: 0.85rem;">
                        ${percent}%
                    </span>
                </td>
                <td style="padding: 1.2rem; text-align: center; color: #64748B;">${Math.floor(res.time_spent / 60)} хв</td>
                <td style="padding: 1.2rem; text-align: center;">
                    <button class="btn-outline" style="padding: 6px 12px; font-size: 0.8rem; border-radius: 6px;">Деталі</button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * СЛАБКІ ТЕМИ
 */
function renderWeakTopics(stats) {
    const container = document.getElementById('weakTopics');
    const topics = Object.entries(stats.weakTopics);

    if (topics.length === 0) {
        container.innerHTML = '<p class="empty-state">Чудова робота! Слабких тем не виявлено.</p>';
        return;
    }

    container.innerHTML = topics.map(([topic, count]) => `
        <div style="display:flex; justify-content:space-between; align-items:center; background:#fff5f5; padding: 10px 15px; border-radius:8px; margin-bottom:10px; border-left: 4px solid #fc8181;">
            <span style="font-weight:600; color:#c53030;">${topic}</span>
            <span style="font-size:0.8rem; color:#e53e3e;">Потрібно повторити</span>
        </div>
    `).join('');
}

/**
 * МАЛЮВАННЯ ГРАФІКА
 */
function drawProgressChart(userStats) {
    const canvas = document.getElementById('progressChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ВИПРАВЛЕННЯ: Беремо останні 10, але сортуємо їх хронологічно (старі -> нові)
    const recentTests = userStats.testHistory
        .slice(-10) 
        .sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));

    if (recentTests.length === 0) return;

    const paddingLeft = 50, paddingBottom = 40, paddingTop = 20, paddingRight = 30;
    const chartWidth = canvas.width - paddingLeft - paddingRight;
    const chartHeight = canvas.height - paddingTop - paddingBottom;

    // 1. Шкала Y (залишається без змін)
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.strokeStyle = '#f1f5f9';
    ctx.textAlign = 'right'; // Покращуємо вирівнювання тексту шкали
    for (let i = 0; i <= 4; i++) {
        const val = i * 25;
        const y = canvas.height - paddingBottom - (chartHeight * val / 100);
        ctx.fillText(val, paddingLeft - 10, y + 4);
        ctx.beginPath(); ctx.moveTo(paddingLeft, y); ctx.lineTo(canvas.width - paddingRight, y); ctx.stroke();
    }

    // 2. Лінія графіка
    const stepX = recentTests.length > 1 ? chartWidth / (recentTests.length - 1) : 0;
    ctx.strokeStyle = '#4A90E2';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round'; // Робимо з'єднання ліній плавнішими
    ctx.beginPath();
    
    recentTests.forEach((t, i) => {
        const x = paddingLeft + (stepX * i);
        const y = canvas.height - paddingBottom - (chartHeight * t.percent / 100);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Точки та дати (тепер нові будуть справа)
    ctx.textAlign = 'center';
    recentTests.forEach((t, i) => {
        const x = paddingLeft + (stepX * i);
        const y = canvas.height - paddingBottom - (chartHeight * t.percent / 100);
        
        // Малюємо точку
        ctx.fillStyle = '#4A90E2';
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = '#white'; ctx.lineWidth = 2; ctx.stroke();
        
        // Малюємо дату під віссю X
        ctx.fillStyle = '#64748b';
        const dateStr = new Date(t.completed_at).toLocaleDateString('uk-UA', {day:'2-digit', month:'2-digit'});
        ctx.fillText(dateStr, x, canvas.height - 10);
    });
}

/**
 * ДОПОМІЖНІ ФУНКЦІЇ
 */
function initProgressChart(userStats) {
    const canvas = document.getElementById('progressChart');
    const container = canvas.parentElement;
    const resize = () => {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
        drawProgressChart(userStats);
    };
    resize();
    window.addEventListener('resize', resize);
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    let interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " дн. тому";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " год. тому";
    return "щойно";
}