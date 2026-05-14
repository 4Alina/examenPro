let testsData = [];
document.addEventListener('DOMContentLoaded', () => {
    loadMyTests();
    
});

/* =========================
   ЗАВАНТАЖЕННЯ ТЕСТІВ
========================= */

async function loadMyTests() {
    try {
        
        const response = await fetch(`/api/teacher/${TEACHER_ID}/tests`);
        testsData = await response.json();
        renderTests(testsData);
        initSearchAndSort();

    } catch (err) {
        console.error(err);
    }
}

function renderTests(tests) {
    console.error(tests);
        const tbody = document.getElementById('testsTableBody');
    if(!tbody) {
        console.warn("Таблиця testsTableBody не знайдена");
        return;
    }
    tbody.innerHTML = tests.map(test => `
        <tr>
            <td>${test.title}</td>
            <td>${test.subject}</td>
            <td>${test.questions_count}</td>
            <td>${test.difficulty}</td>
            <td>${test.time_limit} хв</td>

            <td>
                <select onchange="changeStatus(${test.id}, this.value)">
                    <option value="active" ${test.status==='active'?'selected':''}>Активний</option>
                    <option value="draft" ${test.status==='draft'?'selected':''}>Чернетка</option>
                    <option value="archived" ${test.status==='archived'?'selected':''}>Архів</option>
                </select>
            </td>

            <td>${test.results_count}</td>

            <td>
                <div class="table-actions">
                    <button class="icon-btn edit" onclick="editTest(${test.id})" title="Редагувати">
                        ✏️
                    </button>
                    <button class="icon-btn stats" onclick="viewTestStats(${test.id})" title="Статистика">
                        📊
                    </button>
                    <button class="icon-btn delete" onclick="confirmDeleteTest(${test.id})" title="Видалити">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// 1. ЗМІНА СТАТУСУ ТЕСТУ (Активний, Чернетка, Архів)
async function changeStatus(testId, newStatus) {
    try {
        const response = await fetch(`/api/tests/${testId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) throw new Error('Помилка оновлення статусу');
        
        // Можна додати легке сповіщення (Toast)
        console.log(`Тест ${testId} тепер має статус: ${newStatus}`);
    } catch (error) {
        alert('Не вдалося змінити статус: ' + error.message);
    }
}

// 2. РЕДАГУВАННЯ ТЕСТУ
async function editTest(testId) {
    try {
        // Отримуємо дані тесту разом з питаннями
        const response = await fetch(`/api/tests/${testId}`);
        const test = await response.json();

        // Відкриваємо модалку (яку ми робили раніше)
        document.getElementById('testEditorModal').style.display = 'block';

        // Заповнюємо основні поля
        document.getElementById('testTitle').value = test.title;
        document.getElementById('testDescription').value = test.description || '';
        document.getElementById('testSubject').value = test.subject;
        document.getElementById('testDifficulty').value = test.difficulty;
        document.getElementById('testTime').value = test.time_limit;

        // Очищуємо та заповнюємо контейнер питань
        const container = document.getElementById('questionsContainer');
        container.innerHTML = '';
        
        test.questions.forEach((q, index) => {
            // Тут викликайте вашу функцію додавання поля питання, 
            // але адаптовану під заповнення існуючими даними
            addQuestionField(q); 
        });

        // Додаємо ID тесту до форми, щоб сервер знав, що це UPDATE, а не INSERT
        document.getElementById('testForm').dataset.editId = testId;

    } catch (error) {
        alert('Помилка завантаження даних тесту');
    }
}

// 3. ПЕРЕГЛЯД СТАТИСТИКИ
function viewTestStats(testId) {
    // Просто перенаправляємо на окрему сторінку статистики
    alert('В майбутньому');
}

// 4. ВИДАЛЕННЯ ТЕСТУ
async function confirmDeleteTest(testId) {
    if (confirm('Ви впевнені, що хочете видалити цей тест? Цю дію неможливо скасувати.')) {
        try {
            const response = await fetch(`/api/tests/${testId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Видаляємо елемент зі сторінки без перезавантаження
                location.reload(); 
            } else {
                throw new Error('Помилка сервера при видаленні');
            }
        } catch (error) {
            alert(error.message);
        }
    }
}

/* =========================
   ПОШУК І СОРТУВАННЯ
========================= */

function initSearchAndSort() {

    const searchInput = document.getElementById("searchTests");
    const subjectFilter = document.getElementById("filterSubject");
    const statusFilter = document.getElementById("filterStatus");

    if(searchInput) searchInput.addEventListener("input", applyFilters);
    if(subjectFilter) subjectFilter.addEventListener("change", applyFilters);
    if(statusFilter) statusFilter.addEventListener("change", applyFilters);
}

function applyFilters() {

     if(!testsData) return;

    const search = document.getElementById("searchTests")?.value.toLowerCase() || "";
    const subject = document.getElementById("filterSubject")?.value || "all";
    const status = document.getElementById("filterStatus")?.value || "all";

    let filtered = testsData.filter(t => {
        const matchesSearch = t.title.toLowerCase().includes(search);
        const matchesSubject = subject === "all" || t.subject.toLowerCase() === subject.toLowerCase();
        const matchesStatus = status === "all" || t.status === status;

        return matchesSearch && matchesSubject && matchesStatus;
    });

    renderTests(filtered);
}

/* =========================
   МОДАЛЬНЕ ВІКНО
========================= */

window.openTestEditor = () => {

    document.getElementById("testEditorModal").style.display = "flex";

    const questionsContainer = document.getElementById("questionsContainer");
    questionsContainer.innerHTML = "";

    addQuestionField();
}

window.closeTestEditor = () => {
    document.getElementById("testEditorModal").style.display = "none";
}

/* =========================
   ДОДАВАННЯ ПИТАННЯ
========================= */

window.addQuestionField = () => {

    const container = document.getElementById("questionsContainer");

    const index = document.querySelectorAll(".question-block").length;

    const html = `
        <div class="question-block">

            <h4>Питання ${index+1}</h4>

            <input type="text" class="q-text" placeholder="Текст питання">

            <div class="options">

                <input type="text" class="opt" placeholder="A">
                <input type="text" class="opt" placeholder="B">
                <input type="text" class="opt" placeholder="C">
                <input type="text" class="opt" placeholder="D">

            </div>
            <p>Правильна відповідь:</p>
            <select class="q-correct">
                <option value="0">A</option>
                <option value="1">B</option>
                <option value="2">C</option>
                <option value="3">D</option>
            </select>

            <button onclick="removeQuestion(this)">Видалити питання</button>

        </div>
    `;

    container.insertAdjacentHTML("beforeend", html);
}

window.removeQuestion = (btn) => {

    btn.closest(".question-block").remove();
}

/* =========================
   СТВОРЕННЯ ТЕСТУ
========================= */

document.getElementById("testForm").addEventListener("submit", async (e)=>{

    e.preventDefault();

    const questions = [];

    document.querySelectorAll(".question-block").forEach(block=>{

        const options = Array.from(block.querySelectorAll(".opt"))
            .map(i=>i.value);

        questions.push({

            text: block.querySelector(".q-text").value,

            options: options,

            correctIndex: parseInt(block.querySelector(".q-correct").value)

        });

    });

    const payload = {
        teacher_id: TEACHER_ID,
        title: document.getElementById("testTitle").value,
        description: document.getElementById("testDescription").value,
        subject: document.getElementById("testSubject").value,
        difficulty: document.getElementById("testDifficulty").value,
        timeLimit: document.getElementById("testTime").value,
        questions: questions
    };

    const response = await fetch("/api/tests/create",{

        method:"POST",

        headers:{
            "Content-Type":"application/json"
        },

        body:JSON.stringify(payload)

    });

    if(response.ok){

        alert("Тест створено");

        closeTestEditor();

        loadMyTests();

    }

});