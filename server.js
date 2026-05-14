const express = require('express');
const path = require('path');
const db = require('./db'); // Підключення нашого пулу бази даних
const app = express();
const session = require('express-session'); // ДОДАНО
const bcrypt = require('bcryptjs');         // ДОДАНО
// --- НАЛАШТУВАННЯ EXPRESS ---

// Налаштування шаблонізатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Підключення статичних файлів (CSS, JS, зображення) з папки public
app.use(express.static(path.join(__dirname, 'public')));

// Парсинг даних форм та JSON (необхідно для POST-запитів та API)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// --- НАЛАШТУВАННЯ СЕСІЙ ---
app.use(session({
    secret: 'super_secret_examen_key_123', // У реальному проєкті ховається в .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 } // Сесія живе 1 день
}));

// Проміжок (Middleware), щоб дані користувача були доступні у всіх EJS шаблонах (для навбару)
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.session.error || null;
    delete req.session.error; // Очищаємо помилку після показу
    next();
});

// --- MIDDLEWARE ДЛЯ ЗАХИСТУ СТОРІНОК ---
// Функція перевіряє, чи увійшов користувач
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next(); // Пускаємо далі
    } else {
        res.redirect('/login'); // Викидаємо на сторінку входу
    }
};

// Функція перевіряє, чи має користувач потрібну роль
const requireRole = (role) => {
    return (req, res, next) => {
        // Перевіряємо, чи є юзер і чи збігається його роль
        if (req.session.user && req.session.user.role === role) {
            next(); // Все ок, пускаємо
        } else {
            res.redirect('/'); // Роль не та — викидаємо на головну
        }
    };
};

// --- МАРШРУТИ ДЛЯ СТОРІНОК (ФРОНТЕНД) ---

// Головна сторінка
app.get('/', (req, res) => {
    res.render('index', { title: 'Головна - ЕкзаменПро' });
});

// Панель викладача
app.get('/register', (req, res) => {
    res.render('register', { title: 'Реєстрація' });
});

// Панель викладача
app.get('/login', (req, res) => {
    res.render('login', { title: 'Авторизація' });
});

// Cторінка тестів
app.get('/tests', (req, res) => {
    res.render('tests', { title: 'Тести - ЕкзаменПро' });
});

// ТІЛЬКИ авторизований СТУДЕНТ
app.get('/cabinet', requireAuth, requireRole('student'), (req, res) => {
   res.render('student-cabinet', { title: 'Мій кабінет | ЕкзаменПро'});
});

// ТІЛЬКИ авторизований ВИКЛАДАЧ
app.get('/teacher', requireAuth, requireRole('teacher'), (req, res) => {
    res.render('teacher-panel', { title: 'Панель викладача | ЕкзаменПро' });
});

// Окреме вікно для проходження тесту (Динамічний маршрут з MySQL)
app.get('/test/:id', async (req, res) => {
    try {
        const testId = req.params.id;

        // Шукаємо тест у базі даних за його ID
        const [tests] = await db.query('SELECT * FROM tests WHERE id = ?', [testId]);

        // Якщо тест із таким ID не існує
        if (tests.length === 0) {
            return res.status(404).send('Помилка 404: Такого тесту не знайдено');
        }

        // Якщо тест знайдено, рендеримо сторінку і передаємо дані
        res.render('test-room', { 
            testId: testId,
            testData: tests[0], // Передаємо інформацію про тест (назва, час тощо)
            layout: false       // Вказуємо, що ця сторінка не потребує загальних частин сайту (навігації/футера)
        });

    } catch (error) {
        console.error('Помилка при завантаженні тесту:', error);
        res.status(500).send('Внутрішня помилка сервера');
    }
});


// --- API МАРШРУТИ (ДЛЯ РОБОТИ З БАЗОЮ ДАНИХ ЧЕРЕЗ JS) ---

// Реєстрація
app.post('/api/auth/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        // Перевіряємо, чи є вже такий email
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            req.session.error = 'Користувач з таким email вже існує!';
            return res.redirect('/register');
        }

        // Хешуємо пароль
        const hashedPassword = await bcrypt.hash(password, 10);

        // Зберігаємо в базу
        await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, hashedPassword, role]
        );

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        req.session.error = 'Помилка реєстрації. Спробуйте пізніше.';
        res.redirect('/register');
    }
});

// Вхід
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            req.session.error = 'Невірний email або пароль.';
            return res.redirect('/login');
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            req.session.error = 'Невірний email або пароль.';
            return res.redirect('/login');
        }

        // Записуємо дані користувача в сесію
        req.session.user = {
            id: user.id,
            name: user.name,
            role: user.role
        };

        // Направляємо у відповідний кабінет
        if (user.role === 'student') {
            res.redirect('/cabinet');
        } else {
            res.redirect('/teacher');
        }
    } catch (error) {
        console.error(error);
        req.session.error = 'Помилка сервера під час входу.';
        res.redirect('/login');
    }
});

// Вихід
app.get('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Отримати всі активні тести (використовується на головній сторінці для генерації карток)
app.get('/api/tests', async (req, res) => {
    try {
        const [tests] = await db.query(
            "SELECT * FROM tests WHERE status = 'active'"
        );
        res.json(tests);
    } catch (error) {
        console.error('Помилка отримання тестів:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

// Отримати питання для конкретного тесту (використовуватиметься у test-room)
app.get('/api/tests/:id/questions', async (req, res) => {
    try {
        const testId = req.params.id;
        // Дістаємо питання (але без вказування правильної відповіді, щоб студенти не підглянули в код!)
        const [questions] = await db.query(
            "SELECT * FROM questions WHERE test_id = ?", 
            [testId]
        );
        res.json(questions);
    } catch (error) {
        console.error('Помилка отримання питань:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

// Збереження результатів тесту
app.post('/api/results', async (req, res) => {
    try {
        const { studentId, testId, score, totalQuestions, timeSpent } = req.body;

        // Вставляємо дані в MySQL
        const [result] = await db.query(
            `INSERT INTO test_results (student_id, test_id, score, total_questions, time_spent) 
             VALUES (?, ?, ?, ?, ?)`,
            [studentId, testId, score, totalQuestions, timeSpent]
        );

        res.json({ success: true, message: 'Результат збережено', resultId: result.insertId });
    } catch (error) {
        console.error('Помилка збереження результату:', error);
        res.status(500).json({ error: 'Не вдалося зберегти результат' });
    }
});

// Отримати історію результатів студента
app.get('/api/student/:id/history', async (req, res) => {
    try {
        const studentId = req.params.id;
        const [history] = await db.query(`
            SELECT tr.*, t.title, t.subject 
            FROM test_results tr
            JOIN tests t ON tr.test_id = t.id
            WHERE tr.student_id = ?
            ORDER BY tr.completed_at DESC
        `, [studentId]);

        res.json(history);
    } catch (error) {
        console.error('Помилка отримання історії:', error);
        res.status(500).json({ error: 'Помилка бази даних' });
    }
});

app.post('/api/tests/create', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Додаємо testId (якщо він є, значить це редагування)
        const { testId, teacherId, title, description, subject, difficulty, timeLimit, questions } = req.body;
        const tId = teacherId || req.session.user?.id;

        let finalTestId = testId;

        if (testId) {
            // --- ЛОГІКА РЕДАГУВАННЯ ---
            await connection.query(
                "UPDATE tests SET title = ?, description = ?, subject = ?, difficulty = ?, time_limit = ? WHERE id = ? AND teacher_id = ?",
                [title, description || '', subject, difficulty, timeLimit, testId, tId]
            );

            // Найпростіший спосіб оновити питання: видалити старі й записати нові
            await connection.query("DELETE FROM questions WHERE test_id = ?", [testId]);
        } else {
            // --- ЛОГІКА СТВОРЕННЯ ---
            const [testResult] = await connection.query(
                "INSERT INTO tests (teacher_id, title, description, subject, difficulty, time_limit, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
                [tId, title, description || '', subject, difficulty, timeLimit]
            );
            finalTestId = testResult.insertId;
        }

        // --- ЗАПИС ПИТАНЬ (спільний для обох випадків) ---
        for (const q of questions) {
            await connection.query(
                "INSERT INTO questions (test_id, question_text, answers, correct_answer_index) VALUES (?, ?, ?, ?)",
                [finalTestId, q.text, JSON.stringify(q.options), q.correctIndex]
            );
        }

        await connection.commit();
        res.json({ 
            success: true, 
            message: testId ? 'Тест оновлено!' : 'Тест створено!', 
            testId: finalTestId 
        });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Помилка збереження тесту:', error);
        res.status(500).json({ error: 'Помилка при збереженні даних' });
    } finally {
        if (connection) connection.release();
    }
});

// Отримати всі активні тести (використовується на головній сторінці для генерації карток)
app.get('/api/teacher/:id/tests', async (req, res) => {
    const teacherId = req.params.id;
    try {
        const [tests] = await db.query(
           `SELECT 
                tests.*,
                COUNT(DISTINCT questions.id) AS questions_count,
                COUNT(DISTINCT test_results.id) AS results_count
            FROM tests
            LEFT JOIN questions 
                ON questions.test_id = tests.id
            LEFT JOIN test_results 
                ON test_results.test_id = tests.id
            WHERE tests.teacher_id = ?
            GROUP BY tests.id;`, [teacherId]);
        res.json(tests);
    } catch (error) {
        console.error('Помилка отримання тестів:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

// --- API: ОНОВЛЕННЯ СТАТУСУ ---
app.patch('/api/tests/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.query("UPDATE tests SET status = ? WHERE id = ?", [status, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- API: ОТРИМАННЯ ОДНОГО ТЕСТУ (ДЛЯ РЕДАГУВАННЯ) ---
app.get('/api/tests/:id', async (req, res) => {
    try {
        const [test] = await db.query("SELECT * FROM tests WHERE id = ?", [req.params.id]);
        const [questions] = await db.query("SELECT * FROM questions WHERE test_id = ?", [req.params.id]);
        
        if (test.length === 0) return res.status(404).json({ error: 'Тест не знайдено' });

        // Розпарсимо JSON відповідей для кожного питання
        const formattedQuestions = questions.map(q => ({
            ...q,
            options: typeof q.answers === 'string' ? JSON.parse(q.answers) : q.answers,
            correctIndex: q.correct_answer_index
        }));

        res.json({ ...test[0], questions: formattedQuestions });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- API: ВИДАЛЕННЯ ТЕСТУ ---
app.delete('/api/tests/:id', async (req, res) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        
        // Видаляємо спочатку питання (якщо немає ON DELETE CASCADE в БД)
        await connection.query("DELETE FROM questions WHERE test_id = ?", [req.params.id]);
        // Видаляємо тест
        await connection.query("DELETE FROM tests WHERE id = ?", [req.params.id]);
        
        await connection.commit();
        res.json({ success: true });
    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});


// --- ОБРОБКА ПОМИЛОК ---

// Обробка помилки 404 (якщо користувач ввів неіснуючий URL)
app.use((req, res) => {
    res.status(404).send('Сторінку не знайдено');
});


// --- ЗАПУСК СЕРВЕРА ---

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Сервер успішно запущено на http://localhost:${PORT}`);
});