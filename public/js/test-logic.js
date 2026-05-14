// public/js/test-logic.js

let questions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timeLeft = 0;
let timerInterval;
let testDurationSeconds = 0; // Для розрахунку витраченого часу
let violations = 0; // Лічильник порушень (перемикання вкладок)

document.addEventListener('DOMContentLoaded', () => {
    initTest();
    setupSecurity(); // Включаємо захист
});

/**
 * 0. ЗАХИСТ ТА БЕЗПЕКА
 */
function setupSecurity() {
    // 1. Захист від закриття/перезавантаження
    window.addEventListener('beforeunload', (e) => {
        e.preventDefault();
        e.returnValue = ''; 
    });

    // 2. Блокування правої кнопки миші (контекстного меню)
    document.addEventListener('contextmenu', e => e.preventDefault());

    // 3. Блокування клавіш перегляду коду (F12, Ctrl+Shift+I, Ctrl+U)
    document.addEventListener('keydown', (e) => {
        if (
            e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) || 
            (e.ctrlKey && e.key.toLowerCase() === 'u')
        ) {
            e.preventDefault();
            alert("Ця дія заборонена під час тесту!");
        }
    });

    // 4. Детекція перемикання вкладок
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            violations++;
            // Таймер НЕ зупиняється, але ми фіксуємо порушення
            console.warn(`Порушення #${violations}: Студент покинув сторінку.`);
            alert(`Увага! Не покидайте сторінку тесту. Порушення зафіксовано (${violations}).`);
        }
    });

    // 5. Спроба ввімкнути повний екран при першому кліку (браузери вимагають жест користувача)
    document.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => {
                console.warn("Не вдалося ввімкнути повний екран");
            });
        }
    }, { once: true });
}

/**
 * 1. ІНІЦІАЛІЗАЦІЯ ТЕСТУ
 */
async function initTest() {
    try {
        const response = await fetch(`/api/tests/${TEST_ID}/questions`);
        questions = await response.json();
        
        if (questions.length === 0) {
            alert('У цьому тесті поки немає питань.');
            window.close();
            return;
        }

        // Встановлюємо таймер (наприклад, 20 хв)
        const duration = 20 * 60;
        testDurationSeconds = duration;
        startTimer(duration); 

        renderQuestion();
        updateNavigation();
    } catch (error) {
        console.error('Помилка завантаження тесту:', error);
        alert('Не вдалося завантажити питання.');
    }
}

/**
 * 2. ВІДОБРАЖЕННЯ ПИТАННЯ
 */
function renderQuestion() {
    const q = questions[currentQuestionIndex];
    const container = document.getElementById('questionContainer');
    
    document.getElementById('questionCounter').textContent = `Питання ${currentQuestionIndex + 1} з ${questions.length}`;
    
    let optionsHtml = '';
    const options = typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers;
    
    options.forEach((option, index) => {
        const isSelected = userAnswers[currentQuestionIndex] === index;
        optionsHtml += `
            <div class="option-item ${isSelected ? 'selected' : ''}" onclick="selectOption(${index})">
                <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                <span class="option-text">${option}</span>
            </div>
        `;
    });

    container.innerHTML = `
        <div class="question-card">
            <h3>${q.question_text}</h3>
            <div id="optionsList">${optionsHtml}</div>
        </div>
    `;
}

window.selectOption = (index) => {
    userAnswers[currentQuestionIndex] = index;
    renderQuestion();
};

/**
 * 4. НАВІГАЦІЯ
 */
document.getElementById('nextBtn').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
        updateNavigation();
    }
});

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
        updateNavigation();
    }
});

function updateNavigation() {
    const nextBtn = document.getElementById('nextBtn');
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');

    prevBtn.disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === questions.length - 1) {
        nextBtn.style.display = 'none';
        submitBtn.style.display = 'block';
    } else {
        nextBtn.style.display = 'block';
        submitBtn.style.display = 'none';
    }
}

/**
 * 5. ТАЙМЕР (Покращений: не збивається при згортанні)
 */
function startTimer(seconds) {
    const startTime = Date.now();
    const endTime = startTime + (seconds * 1000);
    const timerDisplay = document.getElementById('timer');

    timerInterval = setInterval(() => {
        const now = Date.now();
        const diff = Math.ceil((endTime - now) / 1000);

        if (diff <= 0) {
            timeLeft = 0;
            clearInterval(timerInterval);
            timerDisplay.textContent = "00:00";
            alert("Час вичерпано!");
            finishTest();
            return;
        }

        timeLeft = diff;
        const minutes = Math.floor(diff / 60);
        const secs = diff % 60;
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
}

/**
 * 6. ЗАВЕРШЕННЯ ТЕСТУ
 */
document.getElementById('submitBtn').addEventListener('click', () => {
    if (confirm('Ви впевнені, що хочете завершити тест?')) {
        finishTest();
    }
});

async function finishTest() {
    clearInterval(timerInterval);

    // Підрахунок балів
    let correctCount = 0;
    questions.forEach((q, index) => {
        if (userAnswers[index] !== undefined && userAnswers[index] === q.correct_answer_index) {
            correctCount++;
        }
    });

    const resultData = {
        studentId: STUDENT_ID,
        testId: TEST_ID,
        score: correctCount,
        totalQuestions: questions.length,
        timeSpent: testDurationSeconds - timeLeft,
        violations: violations // Відправляємо кількість порушень на сервер
    };

    try {
        const response = await fetch('/api/results', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(resultData)
        });

        if (response.ok) {
            alert(`Тест завершено! Ваш результат: ${correctCount} з ${questions.length}`);
            // Знімаємо захист від закриття вікна перед виходом
            window.onbeforeunload = null;
            setTimeout(() => window.close(), 1500);
        }
    } catch (error) {
        console.error('Помилка відправки:', error);
        alert('Помилка збереження результату.');
    }
}