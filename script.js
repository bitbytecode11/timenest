document.addEventListener('DOMContentLoaded', () => {

    // --- Data Persistence & State ---
    let tasks = JSON.parse(localStorage.getItem('dashboardTasks')) || [];
    let events = JSON.parse(localStorage.getItem('dashboardEvents')) || [];
    let activeDateStr = null; // To track the currently "open" day in the calendar

    const saveTasks = () => localStorage.setItem('dashboardTasks', JSON.stringify(tasks));
    const saveEvents = () => localStorage.setItem('dashboardEvents', JSON.stringify(events));

    // --- Live Clock ---
    const clockElement = document.getElementById('live-clock');
    function updateClock() { clockElement.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
    setInterval(updateClock, 1000); 
    updateClock();

    // --- Pomodoro & Stopwatch ---
    const swDisplay = document.getElementById('stopwatch-display'); 
    let swInterval, swTime = 0; 
    const formatTime = ms => { const h = String(Math.floor(ms / 3600000)).padStart(2, '0'); const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0'); const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0'); const cs = String(Math.floor((ms % 1000) / 10)).padStart(2, '0'); return `${h}:${m}:${s}.${cs}`; }; 
    document.getElementById('sw-start').addEventListener('click', () => { if (swInterval) return; const startTime = Date.now() - swTime; swInterval = setInterval(() => { swTime = Date.now() - startTime; swDisplay.textContent = formatTime(swTime); }, 10); }); 
    document.getElementById('sw-stop').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; }); 
    document.getElementById('sw-reset').addEventListener('click', () => { clearInterval(swInterval); swInterval = null; swTime = 0; swDisplay.textContent = formatTime(swTime); });
    
    const pomoDisplay = document.getElementById('pomodoro-display'), pomoTimeEl = document.getElementById('pomo-time'), pomoLabelEl = document.getElementById('pomo-label'); 
    let pomoInterval, pomoTime = 25 * 60, isPaused = true, currentMode = 'work', workCycles = 0; 
    const modes = { work: { time: 25 * 60, label: "Work Session" }, shortBreak: { time: 5 * 60, label: "Short Break" }, longBreak: { time: 15 * 60, label: "Long Break" } }; 
    function updatePomoDisplay() { pomoTimeEl.textContent = `${String(Math.floor(pomoTime / 60)).padStart(2, '0')}:${String(pomoTime % 60).padStart(2, '0')}`; const percentage = ((modes[currentMode].time - pomoTime) / modes[currentMode].time) * 360; pomoDisplay.style.background = `conic-gradient(var(--accent-yellow) ${percentage}deg, var(--border-color) 0deg)`; } 
    function switchMode() { currentMode = currentMode === 'work' ? (++workCycles % 4 === 0 ? 'longBreak' : 'shortBreak') : 'work'; pomoTime = modes[currentMode].time; pomoLabelEl.textContent = modes[currentMode].label; alert(`${modes[currentMode].label} starting!`); updatePomoDisplay(); } 
    document.getElementById('pomo-start').addEventListener('click', () => { if (!isPaused) return; isPaused = false; pomoInterval = setInterval(() => { pomoTime--; if (pomoTime < 0) { clearInterval(pomoInterval); isPaused = true; switchMode(); return; } updatePomoDisplay(); }, 1000); }); 
    document.getElementById('pomo-pause').addEventListener('click', () => { isPaused = true; clearInterval(pomoInterval); }); 
    document.getElementById('pomo-reset').addEventListener('click', () => { isPaused = true; clearInterval(pomoInterval); pomoTime = modes[currentMode].time; updatePomoDisplay(); }); 
    updatePomoDisplay();

    // --- To-Do List ---
    const todoForm = document.getElementById('todo-form'), todoInput = document.getElementById('todo-input'), todoCategorySelect = document.getElementById('todo-category'), todoList = document.getElementById('todo-list'), filterBtns = document.querySelectorAll('.filter-btn'), noTasksMsg = document.getElementById('no-tasks-msg');
    const categoryColors = { 'Normal': '#3498db', 'Important': '#f1c40f', 'Assessment': '#2ecc71', 'Exam': '#e74c3c', 'Overdue': '#9b59b6' };
    function renderTasks(filter = 'All') {
        const filteredTasks = tasks.filter(task => filter === 'All' || (filter === 'Active' && !task.completed) || (filter === 'Completed' && task.completed) || task.category === filter);
        todoList.innerHTML = filteredTasks.map(task => `<li class="${task.completed ? 'completed' : ''}"><input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}"><span class="task-text">${task.text}</span><span class="task-category" style="background-color: ${categoryColors[task.category]}">${task.category}</span><button class="task-delete" data-id="${task.id}"><i class="fas fa-trash"></i></button></li>`).join('');
        noTasksMsg.style.display = filteredTasks.length === 0 ? 'block' : 'none';
    }
    todoForm.addEventListener('submit', e => { e.preventDefault(); tasks.push({ id: Date.now(), text: todoInput.value, category: todoCategorySelect.value, completed: false }); saveTasks(); renderTasks(document.querySelector('.filter-btn.active').dataset.filter); todoInput.value = ''; });
    todoList.addEventListener('click', e => { const activeFilter = document.querySelector('.filter-btn.active').dataset.filter; if (e.target.matches('.task-checkbox')) { const task = tasks.find(t => t.id === Number(e.target.dataset.id)); task.completed = !task.completed; } else if (e.target.closest('.task-delete')) { tasks = tasks.filter(t => t.id !== Number(e.target.closest('.task-delete').dataset.id)); } else return; saveTasks(); renderTasks(activeFilter); });
    filterBtns.forEach(btn => btn.addEventListener('click', () => { document.querySelector('.filter-btn.active').classList.remove('active'); btn.classList.add('active'); renderTasks(btn.dataset.filter); }));

    // --- Calendar & Events ---
    const monthYearEl = document.getElementById('month-year'), calendarDaysEl = document.getElementById('calendar-days'), prevMonthBtn = document.getElementById('prev-month'), nextMonthBtn = document.getElementById('next-month');
    let calendarDate = new Date();
    
    const createInlineFormHTML = () => `<form class="inline-event-form" id="inline-event-form"><input type="text" placeholder="New event..." required id="inline-event-text"><select id="inline-event-category"><option value="Important">Important</option> <option value="Assessment">Assessment</option><option value="Exam">Exam</option> <option value="Normal">Normal</option></select><div class="inline-controls"><button type="button" class="inline-cancel-btn">Cancel</button><button type="submit" class="btn-add">Add</button></div></form>`;

    function renderCalendar() {
        calendarDate.setDate(1);
        const month = calendarDate.getMonth(), year = calendarDate.getFullYear();
        monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
        const firstDayIndex = calendarDate.getDay();
        const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
        calendarDaysEl.innerHTML = '';
        for (let i = 0; i < firstDayIndex; i++) { calendarDaysEl.innerHTML += `<div class="day"></div>`; }
        for (let i = 1; i <= lastDayOfMonth; i++) {
            const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isToday = new Date().toDateString() === new Date(dayStr+'T00:00:00').toDateString();
            const isActive = dayStr === activeDateStr;
            const dayEventsHTML = events.filter(e => e.date === dayStr).map(event => `<div class="event-pill" style="background-color: ${categoryColors[event.category]}" title="${event.text}">${event.text}<button class="delete-event-btn" data-id="${event.id}">&times;</button></div>`).join('');
            const formHTML = isActive ? createInlineFormHTML() : '';
            calendarDaysEl.innerHTML += `<div class="day current-month ${isToday ? 'today' : ''} ${isActive ? 'day--active' : ''}" data-date="${dayStr}"><div class="day-number">${i}</div><div class="day-events">${dayEventsHTML}</div>${formHTML}</div>`;
        }
    }

    // This listener handles submitting the inline form
    calendarDaysEl.addEventListener('submit', e => {
        if (e.target.matches('#inline-event-form')) {
            e.preventDefault();
            const textInput = document.getElementById('inline-event-text');
            const categoryInput = document.getElementById('inline-event-category');
            events.push({ id: Date.now(), date: activeDateStr, text: textInput.value, category: categoryInput.value });
            saveEvents();
            activeDateStr = null;
            renderCalendar();
        }
    });

    // *** NEW: A single, robust listener on the document to handle all clicks ***
    document.addEventListener('click', e => {
        // --- High-priority checks for specific button clicks ---
        
        // If user clicks the 'cancel' button in the form
        if (e.target.closest('.inline-cancel-btn')) {
            activeDateStr = null;
            renderCalendar();
            return;
        }

        // If user clicks a 'delete' button on an event pill
        if (e.target.closest('.delete-event-btn')) {
            const eventId = Number(e.target.closest('.delete-event-btn').dataset.id);
            events = events.filter(event => event.id !== eventId);
            saveEvents();
            renderCalendar();
            return;
        }

        // --- Logic for day selection and deselection ---

        const dayElement = e.target.closest('.day.current-month');
        
        // If the click is inside the currently active day's content area, do nothing.
        // This PREVENTS the box from closing when you type in the form.
        if (e.target.closest('.day--active')) {
             // ...but still allow selecting another day
            if (dayElement && dayElement.dataset.date !== activeDateStr) {
                 activeDateStr = dayElement.dataset.date;
                 renderCalendar();
            }
            return;
        }

        // If a day was clicked (and it wasn't the active one's content)
        if (dayElement) {
            const dateStr = dayElement.dataset.date;
            activeDateStr = (activeDateStr === dateStr) ? null : dateStr; // Toggle it
            renderCalendar();
        } 
        // If the click was NOT on any day, and a day IS active, close it.
        else if (activeDateStr) {
            activeDateStr = null;
            renderCalendar();
        }
    });

    prevMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderCalendar(); });
    
    // Initial renders on page load
    renderTasks();
    renderCalendar();
});
