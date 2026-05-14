// db.js
const mysql = require('mysql2/promise');

// Створення пулу з'єднань для локальної бази даних (phpMyAdmin)
const pool = mysql.createPool({
    host: 'localhost',                // Локальний хост
    user: 'root',                     // Стандартний користувач для XAMPP/OpenServer
    password: '',                     // За замовчуванням пароль порожній
    database: 'bibn9qnmgzhktn18n6ko',       // ЗАМІНИ НА НАЗВУ СВОЄЇ БАЗИ В phpMyAdmin
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Перевірка підключення
pool.getConnection()
    .then(connection => {
        console.log('✅ Успішно підключено до локальної бази даних (phpMyAdmin)');
        connection.release();
    })
    .catch(err => {
        console.error('❌ Помилка підключення до бази даних:', err.message);
        console.log('Порада: Переконайся, що MySQL запущено в панелі керування (наприклад, XAMPP).');
    });

module.exports = pool;