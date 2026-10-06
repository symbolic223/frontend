# Фронтенд для Babaxaem

    npm install
    npm run dev

Адрес бэкенда — в `.env` (`VITE_API_URL`). Пока эндпоинтов нет, интерфейс работает на демо-данных.

## Эндпоинты, которые ждёт фронтенд
- GET  /api/groups            → [{id, name}]
- GET  /api/subjects          → [{id, name}]
- GET  /api/students?groupId= → [{id, fullName, groupId}]
- POST /api/students          ← {fullName, groupId}
- GET  /api/attendance?groupId=&date=YYYY-MM-DD → [{studentId, status}]  (present | late | excused | absent)
- PUT  /api/attendance        ← {studentId, date, status}
- GET  /api/grades?groupId=   → [{studentId, subjectId, value}]  (value 2–5 или null)
- PUT  /api/grades            ← {studentId, subjectId, value}
