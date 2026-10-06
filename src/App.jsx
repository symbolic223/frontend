import { useEffect, useMemo, useState } from "react";
import { api, onOffline } from "./api.js";

const NEWS = [
  { d: "20.04.2017", t: "«Ярмарка профессий» для выпускников школ Ленинского района", p: "17 апреля в читальном зале библиотеки им. А.С. Пушкина прошла ежегодная «Ярмарка профессий» — профориентационное мероприятие для выпускников школ района." },
  { d: "17.04.2017", t: "Студенты колледжа приняли участие в акции «Чистая территория»", p: "В рамках программы мероприятий, посвящённых году экологии, студенты приняли участие в городской добровольческой акции." },
  { d: "14.04.2017", t: "Студенты колледжа посетили мастер-класс", p: "В Городском межнациональном центре прошла встреча с мастером по изготовлению народной куклы и росписи писанок." },
  { d: "13.04.2017", t: "Вместе против коррупции", p: "В колледже состоялась интеллектуальная игра, направленная на углубление теоретических знаний студентов." },
  { d: "12.04.2017", t: "Дни открытых дверей в колледже печати!", p: "Ближайший День открытых дверей состоится 19 апреля в 14:00. Приглашаем учащихся 9-х и 11-х классов и их родителей." },
];

const STATUS = {
  present: { label: "Присутствует", mark: "" },
  late: { label: "Опоздал", mark: "О" },
  excused: { label: "Уважительная", mark: "У" },
  absent: { label: "Отсутствует", mark: "Н" },
};
const ORDER = ["present", "late", "excused", "absent"];
const today = () => new Date().toISOString().slice(0, 10);

function useGroups() {
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  useEffect(() => { api.groups().then((g) => { setGroups(g); if (g[0]) setGroupId(String(g[0].id)); }); }, []);
  return { groups, groupId, setGroupId };
}

function GroupSelect({ groups, value, onChange }) {
  return (
    <label className="field">Группа
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </label>
  );
}

function Home({ go }) {
  return (
    <div className="home">
      <section>
        <h2>Новости</h2>
        {NEWS.map((n) => (
          <article key={n.t} className="news">
            <time>{n.d}</time>
            <h3>{n.t}</h3>
            <p>{n.p}</p>
          </article>
        ))}
      </section>
      <aside>
        <h2>Учёт студентов</h2>
        <button className="tile" onClick={() => go("attendance")}><b>Посещаемость</b><span>Отметить присутствующих на занятии</span></button>
        <button className="tile" onClick={() => go("grades")}><b>Успеваемость</b><span>Оценки по дисциплинам и средний балл</span></button>
        <button className="tile" onClick={() => go("students")}><b>Студенты</b><span>Списки групп и добавление студентов</span></button>
      </aside>
    </div>
  );
}

function Attendance() {
  const { groups, groupId, setGroupId } = useGroups();
  const [date, setDate] = useState(today());
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});

  useEffect(() => {
    if (!groupId) return;
    Promise.all([api.students(groupId), api.attendance(groupId, date)]).then(([s, a]) => {
      setStudents(s);
      setMarks(Object.fromEntries(a.map((x) => [x.studentId, x.status])));
    });
  }, [groupId, date]);

  const cycle = (id) => {
    const next = ORDER[(ORDER.indexOf(marks[id] ?? "present") + 1) % ORDER.length];
    setMarks((m) => ({ ...m, [id]: next }));
    api.setAttendance(id, date, next);
  };
  const absent = Object.values(marks).filter((v) => v === "absent").length;

  return (
    <section>
      <h2>Журнал посещаемости</h2>
      <div className="toolbar">
        <GroupSelect groups={groups} value={groupId} onChange={setGroupId} />
        <label className="field">Дата<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <p className="summary">Отсутствуют: <b>{absent}</b> из {students.length}</p>
      </div>
      {students.length === 0 ? <p className="empty">В группе нет студентов. Добавьте их на вкладке «Студенты».</p> : (
        <table>
          <thead><tr><th>№</th><th>Студент</th><th>Отметка (нажмите, чтобы изменить)</th></tr></thead>
          <tbody>
            {students.map((s, i) => {
              const st = marks[s.id] ?? "present";
              return (
                <tr key={s.id}>
                  <td>{i + 1}</td><td>{s.fullName}</td>
                  <td><button className={`chip ${st}`} onClick={() => cycle(s.id)}>{STATUS[st].label}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="legend">Н — отсутствует, У — уважительная причина, О — опоздание.</p>
    </section>
  );
}

function Grades() {
  const { groups, groupId, setGroupId } = useGroups();
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState({});

  useEffect(() => {
    if (!groupId) return;
    Promise.all([api.students(groupId), api.subjects(), api.grades(groupId)]).then(([s, sub, g]) => {
      setStudents(s); setSubjects(sub);
      setGrades(Object.fromEntries(g.map((x) => [`${x.studentId}|${x.subjectId}`, x.value])));
    });
  }, [groupId]);

  const change = (sid, subId, raw) => {
    const value = raw === "" ? null : Number(raw);
    setGrades((g) => ({ ...g, [`${sid}|${subId}`]: value }));
    api.setGrade(sid, subId, value);
  };
  const avg = (sid) => {
    const v = subjects.map((s) => grades[`${sid}|${s.id}`]).filter((x) => x != null);
    return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : "—";
  };

  return (
    <section>
      <h2>Успеваемость</h2>
      <div className="toolbar"><GroupSelect groups={groups} value={groupId} onChange={setGroupId} /></div>
      {students.length === 0 ? <p className="empty">В группе нет студентов.</p> : (
        <div className="scroll">
          <table>
            <thead><tr><th>Студент</th>{subjects.map((s) => <th key={s.id}>{s.name}</th>)}<th>Средний балл</th></tr></thead>
            <tbody>
              {students.map((st) => (
                <tr key={st.id}>
                  <td>{st.fullName}</td>
                  {subjects.map((sub) => (
                    <td key={sub.id}>
                      <select className={`grade g${grades[`${st.id}|${sub.id}`] ?? 0}`} value={grades[`${st.id}|${sub.id}`] ?? ""}
                        onChange={(e) => change(st.id, sub.id, e.target.value)} aria-label={`${st.fullName}, ${sub.name}`}>
                        <option value="">–</option>{[5, 4, 3, 2].map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </td>
                  ))}
                  <td><b>{avg(st.id)}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Students() {
  const { groups, groupId, setGroupId } = useGroups();
  const [students, setStudents] = useState([]);
  const [name, setName] = useState("");
  const load = () => groupId && api.students(groupId).then(setStudents);
  useEffect(() => { load(); }, [groupId]);

  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.addStudent({ fullName: name.trim(), groupId: Number(groupId) });
    setName(""); load();
  };

  return (
    <section>
      <h2>Студенты</h2>
      <div className="toolbar"><GroupSelect groups={groups} value={groupId} onChange={setGroupId} /></div>
      <form className="toolbar" onSubmit={add}>
        <label className="field grow">ФИО нового студента
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Фамилия Имя Отчество" />
        </label>
        <button className="primary" type="submit">Добавить в группу</button>
      </form>
      <ol className="list">{students.map((s) => <li key={s.id}>{s.fullName}</li>)}</ol>
      {students.length === 0 && <p className="empty">В этой группе пока никого нет.</p>}
    </section>
  );
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [off, setOff] = useState(false);
  useEffect(() => onOffline(setOff), []);
  const tabs = useMemo(() => [["home", "Главная"], ["attendance", "Посещаемость"], ["grades", "Успеваемость"], ["students", "Студенты"]], []);

  return (
    <>
      <header className="top">
        <div className="brand">
          <span className="cmyk" aria-hidden="true"><i /><i /><i /><i /></span>
          <div>
            <strong>Новосибирский колледж печати и информационных технологий</strong>
            <small>Система учёта успеваемости и посещаемости</small>
          </div>
        </div>
      </header>
      <nav className="menu">
        {tabs.map(([k, l]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}
      </nav>
      {off && <div className="banner">Сервер недоступен — показаны демо-данные. Проверьте, что бэкенд запущен и адрес в .env указан верно.</div>}
      <main>
        {tab === "home" && <Home go={setTab} />}
        {tab === "attendance" && <Attendance />}
        {tab === "grades" && <Grades />}
        {tab === "students" && <Students />}
      </main>
      <footer>© Колледж печати и информационных технологий</footer>
    </>
  );
}
