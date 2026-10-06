// Клиент к ASP.NET-бэкенду. Если сервер или эндпоинт недоступны —
// работает на демо-данных, чтобы интерфейс можно было смотреть сразу.
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:5084";

let offline = false;
const listeners = new Set();
export const onOffline = (fn) => { listeners.add(fn); fn(offline); return () => listeners.delete(fn); };
const setOffline = (v) => { if (offline !== v) { offline = v; listeners.forEach((f) => f(v)); } };

async function http(path, opts = {}) {
  const r = await fetch(BASE + path, { headers: { "Content-Type": "application/json" }, ...opts });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.status === 204 ? null : r.json();
}
async function tryApi(call, fallback) {
  try { const d = await call(); setOffline(false); return d; }
  catch { setOffline(true); return fallback(); }
}

/* ---------- демо-данные ---------- */
const demo = {
  groups: [{ id: 1, name: "Д-9-15" }, { id: 2, name: "Р-11-15" }, { id: 3, name: "ИДР-11-16" }],
  subjects: [{ id: 1, name: "Математика" }, { id: 2, name: "Информатика" }, { id: 3, name: "Компьютерная графика" }, { id: 4, name: "Технология печати" }],
  students: [
    { id: 1, fullName: "Иванова Анна Сергеевна", groupId: 1 }, { id: 2, fullName: "Петров Дмитрий Олегович", groupId: 1 },
    { id: 3, fullName: "Смирнова Ольга Ивановна", groupId: 1 }, { id: 4, fullName: "Козлов Артём Викторович", groupId: 2 },
    { id: 5, fullName: "Лебедева Мария Андреевна", groupId: 2 }, { id: 6, fullName: "Орлов Никита Павлович", groupId: 3 },
  ],
  attendance: {}, // "studentId|date" -> status
  grades: { "1|1": 5, "1|2": 4, "2|1": 3, "2|3": 4, "3|2": 5, "4|4": 4, "5|1": 5 }, // "studentId|subjectId"
};

export const api = {
  groups: () => tryApi(() => http("/api/groups"), () => demo.groups),
  subjects: () => tryApi(() => http("/api/subjects"), () => demo.subjects),
  students: (groupId) =>
    tryApi(() => http(`/api/students${groupId ? `?groupId=${groupId}` : ""}`),
      () => demo.students.filter((s) => !groupId || s.groupId === Number(groupId))),
  addStudent: (s) =>
    tryApi(() => http("/api/students", { method: "POST", body: JSON.stringify(s) }),
      () => { const n = { ...s, id: Date.now() }; demo.students.push(n); return n; }),
  attendance: (groupId, date) =>
    tryApi(() => http(`/api/attendance?groupId=${groupId}&date=${date}`),
      () => demo.students.filter((s) => s.groupId === Number(groupId))
        .map((s) => ({ studentId: s.id, status: demo.attendance[`${s.id}|${date}`] ?? "present" }))),
  setAttendance: (studentId, date, status) =>
    tryApi(() => http("/api/attendance", { method: "PUT", body: JSON.stringify({ studentId, date, status }) }),
      () => { demo.attendance[`${studentId}|${date}`] = status; }),
  grades: (groupId) =>
    tryApi(() => http(`/api/grades?groupId=${groupId}`),
      () => demo.students.filter((s) => s.groupId === Number(groupId))
        .flatMap((s) => demo.subjects.map((sub) => ({ studentId: s.id, subjectId: sub.id, value: demo.grades[`${s.id}|${sub.id}`] ?? null })))),
  setGrade: (studentId, subjectId, value) =>
    tryApi(() => http("/api/grades", { method: "PUT", body: JSON.stringify({ studentId, subjectId, value }) }),
      () => { demo.grades[`${studentId}|${subjectId}`] = value; }),
};
