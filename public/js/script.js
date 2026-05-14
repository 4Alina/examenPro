document.addEventListener('DOMContentLoaded', () => {
    // 1. Ініціалізація головних функцій
    loadTestsFromServer();
    setupMobileMenu();
    setupAuthModals();
});

/**
 * 2. ЗАВАНТАЖЕННЯ ТЕСТІВ З БАЗИ ДАНИХ
 */
async function loadTestsFromServer() {
    const testsGrid = document.getElementById('testsGrid');
    if (!testsGrid) return;

    try {
        // Робимо запит до нашого Node.js API
        const response = await fetch('/api/tests');
        const tests = await response.json();

        if (tests.length === 0) {
            testsGrid.innerHTML = '<p class="empty-msg">Наразі немає доступних тестів.</p>';
            return;
        }

        renderTests(tests);
        setupFilters(tests);

    } catch (error) {
        console.error('Помилка при отриманні тестів:', error);
        testsGrid.innerHTML = '<p class="error-msg">Не вдалося завантажити тести. Спробуйте пізніше.</p>';
    }
}

/**
 * 3. ВІДОБРАЖЕННЯ КАРТОК ТЕСТІВ
 */
function renderTests(tests) {
    const testsGrid = document.getElementById('testsGrid');
    testsGrid.innerHTML = ''; // Очищуємо лоадер

    tests.forEach(test => {
        const card = document.createElement('div');
        card.className = 'test-card';
        card.dataset.subject = test.subject;

        // Мапимо складність на зрозумілий текст та клас
        const difficultyLabels = { 'easy': 'Легкий', 'medium': 'Середній', 'hard': 'Складний' };

        card.innerHTML = `
            <div class="test-card-header">
                <span class="test-subject">${test.subject}</span>
                <span class="test-difficulty difficulty-${test.difficulty}">
                    ${difficultyLabels[test.difficulty]}
                </span>
            </div>
            <h3>${test.title}</h3>
            <p>${test.description || 'Опис відсутній'}</p>
            <div class="test-meta">
                <span>⏱️ ${test.time_limit} хв</span>
            </div>
            <button class="btn-primary btn-full" onclick="startTest(${test.id})">
                Почати тест
            </button>
        `;
        testsGrid.appendChild(card);
    });
}

/**
 * 4. ЛОГІКА ВІДКРИТТЯ ТЕСТУ
 */
function startTest(testId) {
    // Відкриваємо сторінку тестування в новому вікні, як ви і хотіли
    window.open(`/test/${testId}`, '_blank', 'width=1000,height=800');
}

/**
 * 5. ФІЛЬТРАЦІЯ ТЕСТІВ (Фронтенд-фільтрація)
 */
function setupFilters(allTests) {
    const subjectFilter = document.getElementById('subjectFilter');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const searchInput = document.getElementById('searchInput');

    function applyFilters() {
        const subjectValue = subjectFilter.value;
        const difficultyValue = difficultyFilter.value;
        const searchQuery = searchInput.value.toLowerCase();

        const filtered = allTests.filter(test => {
            const matchesSubject =
                subjectValue === 'all' ||
                test.subject.toLowerCase() === subjectValue.toLowerCase();

            const matchesDifficulty =
                difficultyValue === 'all' ||
                test.difficulty.toLowerCase() === difficultyValue.toLowerCase();

            const matchesSearch =
                test.title.toLowerCase().includes(searchQuery) ||
                test.description.toLowerCase().includes(searchQuery);

            return matchesSubject && matchesDifficulty && matchesSearch;
        });

        renderTests(filtered);
    }

    subjectFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);
}



/**
 * 6. МОБІЛЬНЕ МЕНЮ (Гамбургер)
 */
function setupMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }
}

/**
 * 7. МОДАЛЬНІ ВІКНА (Вхід / Реєстрація)
 */
function setupAuthModals() {
    // Приклад функцій, які можна викликати з navbar.ejs
    window.openLoginModal = () => {
        console.log('Показуємо вікно входу');
        // Тут ваша логіка показу модалки (classList.add('active'))
    };

    window.openRegisterModal = () => {
        console.log('Показуємо вікно реєстрації');
    };
}