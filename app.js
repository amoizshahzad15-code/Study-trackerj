/**
 * StudySprint — Intelligent Syllabus Tracker & Study Planner
 * Single-User Application (V5 Specification)
 * Storage Key: STUDYSPRINT_PERSONAL_V5
 */

(function () {
  'use strict';

  // --- Constants & Keys ---
  const STORAGE_KEY = 'STUDYSPRINT_PERSONAL_V5';

  // --- Initial / Default State Generator ---
  function getTodayStr() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getDefaultState() {
    const today = getTodayStr();
    return {
      day1Date: today,
      currentSprintDay: 1, // Explicit active sprint day
      subjects: [],
      tasks: [],
      history: {},
      theme: 'dark'
    };
  }

  // --- State Persistence ---
  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.tasks)) {
          // If no tasks exist, always ensure day 1 is active
          if (parsed.tasks.length === 0) {
            parsed.currentSprintDay = 1;
            parsed.day1Date = getTodayStr();
          } else if (!parsed.currentSprintDay) {
            parsed.currentSprintDay = getCurrentSprintDay(parsed.day1Date);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
    }
    const fresh = getDefaultState();
    saveState(fresh);
    return fresh;
  }

  function saveState(s) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
  }

  // --- Sprint Calculations ---
  function getCurrentSprintDay(day1Date) {
    if (state && state.currentSprintDay) {
      return state.currentSprintDay;
    }
    if (!day1Date) return 1;
    const parts = day1Date.split('-');
    const d1 = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffMs = todayMidnight - d1;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays + 1);
  }

  function getStreak(history) {
    let streak = 0;
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayStr = getTodayStr();

    let checkDate = new Date(todayMidnight);
    if (!history[todayStr] || history[todayStr] <= 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const y = checkDate.getFullYear();
      const m = String(checkDate.getMonth() + 1).padStart(2, '0');
      const d = String(checkDate.getDate()).padStart(2, '0');
      const ds = `${y}-${m}-${d}`;

      if (history[ds] && history[ds] > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  // --- Audio Feedback (Two-Tone Chime) ---
  function playTwoToneChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.12);
      gain2.gain.setValueAtTime(0.15, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.45);
    } catch (e) {}
  }

  function triggerConfetti() {
    if (typeof confetti === 'function') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.75 },
          colors: ['#10b981', '#34d399', '#6ee7b7', '#059669', '#f59e0b']
        });
      } catch (e) {}
    }
  }

  // --- Pomodoro Timer Engine ---
  let pomodoro = {
    mode: 'focus',
    totalSeconds: 25 * 60,
    remainingSeconds: 25 * 60,
    isRunning: false,
    targetEndTime: null,
    intervalId: null,
    completedSessions: 0
  };

  function updatePomodoro() {
    if (pomodoro.isRunning) {
      const now = Date.now();
      pomodoro.remainingSeconds = Math.max(0, Math.round((pomodoro.targetEndTime - now) / 1000));
      if (pomodoro.remainingSeconds <= 0) {
        pomodoro.isRunning = false;
        clearInterval(pomodoro.intervalId);
        pomodoro.intervalId = null;
        playTwoToneChime();
        triggerConfetti();
        if (pomodoro.mode === 'focus') {
          pomodoro.completedSessions++;
        }
      }
    }
    syncPomodoroUI();
  }

  function syncPomodoroUI() {
    const min = String(Math.floor(pomodoro.remainingSeconds / 60)).padStart(2, '0');
    const sec = String(pomodoro.remainingSeconds % 60).padStart(2, '0');
    const timeStr = `${min}:${sec}`;

    const mainTimeEl = document.getElementById('pomo-display-time');
    if (mainTimeEl) {
      mainTimeEl.textContent = timeStr;
    }
    const mainBtnEl = document.getElementById('pomo-main-btn');
    if (mainBtnEl) {
      mainBtnEl.innerHTML = pomodoro.isRunning
        ? '<i data-lucide="pause" class="w-6 h-6"></i><span>Pause Session</span>'
        : '<i data-lucide="play" class="w-6 h-6"></i><span>Start Focus</span>';
    }
    const pomoRing = document.getElementById('pomo-progress-ring');
    if (pomoRing) {
      const circumference = 2 * Math.PI * 110;
      const progress = pomodoro.totalSeconds > 0 ? (pomodoro.totalSeconds - pomodoro.remainingSeconds) / pomodoro.totalSeconds : 0;
      pomoRing.style.strokeDashoffset = circumference * (1 - progress);
    }

    const miniDock = document.getElementById('mini-dock');
    const currentHash = window.location.hash || '#/dashboard';
    if (miniDock) {
      if (currentHash !== '#/pomodoro' && (pomodoro.isRunning || pomodoro.remainingSeconds !== pomodoro.totalSeconds)) {
        miniDock.classList.remove('hidden');
        const mTime = document.getElementById('mini-dock-time');
        const mMode = document.getElementById('mini-dock-mode');
        const mIcon = document.getElementById('mini-dock-icon');
        if (mTime) mTime.textContent = timeStr;
        if (mMode) mMode.textContent = pomodoro.mode === 'focus' ? 'Focus' : 'Break';
        if (mIcon) {
          mIcon.setAttribute('data-lucide', pomodoro.isRunning ? 'pause' : 'play');
        }
      } else {
        miniDock.classList.add('hidden');
      }
    }

    if (window.lucide) lucide.createIcons();
  }

  // --- View State & In-Memory Form Cache ---
  let viewDay = state.currentSprintDay || 1;
  let activeNdTaskId = null;
  let dayInputsMemory = {}; // Caches day-by-day syllabus input text while configuring

  // --- Spec-Required Global Functions ---

  /**
   * done(id): Mark task as done / undo.
   */
  window.done = function (id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const today = getTodayStr();

    if (task.status === 'done') {
      task.status = 'todo';
      if (state.history[today] && state.history[today] > 0) {
        state.history[today]--;
      }
    } else {
      task.status = 'done';
      state.history[today] = (state.history[today] || 0) + 1;
      playTwoToneChime();
      triggerConfetti();
    }
    saveState(state);
    render();
  };

  /**
   * nd(id): Open Not-Done popup modal.
   */
  window.nd = function (id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    activeNdTaskId = id;

    const popup = document.getElementById('nd-popup');
    const titleEl = document.getElementById('nd-task-title');
    if (titleEl) titleEl.textContent = task.title;

    const btnTomorrow = document.getElementById('nd-btn-tomorrow');
    const btnBacklog = document.getElementById('nd-btn-backlog');
    const btnBalance = document.getElementById('nd-btn-balance');

    if (btnTomorrow) btnTomorrow.onclick = () => window.rs(id, 't');
    if (btnBacklog) btnBacklog.onclick = () => window.rs(id, 'b');
    if (btnBalance) btnBalance.onclick = () => window.rs(id, 'x');

    if (popup) popup.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  };

  window.hideNdPopup = function () {
    const popup = document.getElementById('nd-popup');
    if (popup) popup.classList.add('hidden');
    activeNdTaskId = null;
  };

  window.closeNdPopup = function (e) {
    if (e.target && e.target.id === 'nd-popup') {
      window.hideNdPopup();
    }
  };

  /**
   * rs(id, choice): Reschedule choice.
   */
  window.rs = function (id, choice) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const todaySprint = state.currentSprintDay || getCurrentSprintDay(state.day1Date);

    if (choice === 't') {
      task.day = Math.max(task.day + 1, todaySprint + 1);
      task.status = 'todo';
    } else if (choice === 'b') {
      task.status = 'backlog';
    } else if (choice === 'x') {
      const candidateDays = [todaySprint + 1, todaySprint + 2, todaySprint + 3];
      let bestDay = candidateDays[0];
      let minTasks = Infinity;

      candidateDays.forEach(d => {
        const count = state.tasks.filter(t => t.day === d && t.status === 'todo').length;
        if (count < minTasks) {
          minTasks = count;
          bestDay = d;
        }
      });
      task.day = bestDay;
      task.status = 'todo';
    }

    window.hideNdPopup();
    saveState(state);
    render();
  };

  /**
   * note(id): Prompt user to add/edit a short note for the task.
   */
  window.note = function (id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    const val = prompt('Enter a short note or hint for this task:', task.note || '');
    if (val !== null) {
      task.note = val.trim();
      saveState(state);
      render();
    }
  };

  /**
   * gd(day, makeToday): Navigate to specific Sprint Day.
   * If makeToday is true (e.g. selected via dropdown in Today's Focus), sets active day!
   */
  window.gd = function (day, makeToday = false) {
    viewDay = Math.max(1, parseInt(day, 10) || 1);
    if (makeToday) {
      window.setAsToday(viewDay, false);
    } else {
      window.location.hash = '#/daily';
      render();
    }
  };

  /**
   * setAsToday(day, showNotice): Explicitly set active Sprint Day.
   * Updates state.currentSprintDay and aligns state.day1Date so calendar math remains consistent.
   */
  window.setAsToday = function (day, showNotice = true) {
    const targetDay = Math.max(1, parseInt(day, 10) || 1);
    state.currentSprintDay = targetDay;
    viewDay = targetDay;

    // Recalibrate day1Date so diffDays + 1 = targetDay
    const now = new Date();
    const d1 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d1.setDate(d1.getDate() - (targetDay - 1));
    const y = d1.getFullYear();
    const m = String(d1.getMonth() + 1).padStart(2, '0');
    const d = String(d1.getDate()).padStart(2, '0');
    state.day1Date = `${y}-${m}-${d}`;

    saveState(state);
    window.location.hash = '#/daily';
    render();

    if (showNotice) {
      // Subtle alert
      console.log(`Active Sprint Day set to Day ${targetDay}`);
    }
  };

  /**
   * promptChangeSprintDay(): Let user change their active sprint day directly from sidebar/header.
   */
  window.promptChangeSprintDay = function () {
    const current = state.currentSprintDay || 1;
    const input = prompt(`Enter active Sprint Day number (e.g. 1):`, current);
    if (input !== null) {
      const d = Math.max(1, parseInt(input, 10) || 1);
      window.setAsToday(d);
    }
  };

  /**
   * addSub(): Add a new course with Day-by-Day individual inputs or Auto-Distribute mode.
   */
  window.addSub = function () {
    const nameInput = document.getElementById('sub-name');
    const timelineSelect = document.getElementById('sub-timeline');
    const customDaysInput = document.getElementById('sub-custom-days');
    const examDateInput = document.getElementById('sub-exam');
    const modeAutoRadio = document.getElementById('sub-mode-auto');

    if (!nameInput) return;
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a subject name.');
      nameInput.focus();
      return;
    }

    let sprintDays = 20;
    if (timelineSelect) {
      if (timelineSelect.value === 'custom') {
        sprintDays = parseInt(customDaysInput ? customDaysInput.value : 17, 10) || 17;
      } else {
        sprintDays = parseInt(timelineSelect.value, 10) || 20;
      }
    }
    sprintDays = Math.max(1, Math.min(365, sprintDays));

    const examDate = examDateInput ? examDateInput.value : '';
    const isAutoMode = modeAutoRadio ? modeAutoRadio.checked : false;

    const subId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const colors = ['emerald', 'teal', 'cyan', 'blue', 'indigo', 'violet', 'amber'];
    const assignedColor = colors[state.subjects.length % colors.length];

    const newSubject = {
      id: subId,
      name: name,
      sprintDays: sprintDays,
      examDate: examDate,
      color: assignedColor
    };

    const newTasks = [];

    if (isAutoMode) {
      // Auto-Distribute Mode: reads from single textarea
      const syllabusInput = document.getElementById('sub-syllabus');
      const syllabusText = syllabusInput ? syllabusInput.value.trim() : '';
      if (!syllabusText) {
        alert('Please paste or write your syllabus topics in the text area.');
        if (syllabusInput) syllabusInput.focus();
        return;
      }

      const lines = syllabusText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (lines.length === 0) {
        alert('Please enter at least one topic line.');
        return;
      }

      const total = lines.length;
      lines.forEach((topic, i) => {
        const assignedDay = Math.min(sprintDays, Math.floor((i * sprintDays) / total) + 1);
        newTasks.push({
          id: 'tsk_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substr(2, 3),
          subjectId: subId,
          title: topic,
          day: assignedDay,
          status: 'todo',
          note: ''
        });
      });
    } else {
      // Day-by-Day Mode: reads each day input (day-input-1 to day-input-N)
      let taskCounter = 0;
      for (let d = 1; d <= sprintDays; d++) {
        const dayField = document.getElementById(`day-input-${d}`);
        const content = dayField ? dayField.value.trim() : (dayInputsMemory[d] || '');
        if (content) {
          // Allow multiple topics per day separated by newlines
          const topics = content.split('\n').map(t => t.trim()).filter(t => t.length > 0);
          topics.forEach(topic => {
            taskCounter++;
            newTasks.push({
              id: 'tsk_' + Date.now() + '_' + taskCounter + '_' + Math.random().toString(36).substr(2, 3),
              subjectId: subId,
              title: topic,
              day: d,
              status: 'todo',
              note: ''
            });
          });
        }
      }

      if (newTasks.length === 0) {
        alert('Please enter at least one topic in the Day-by-Day syllabus fields.');
        const firstField = document.getElementById('day-input-1');
        if (firstField) firstField.focus();
        return;
      }
    }

    state.subjects.push(newSubject);
    state.tasks.push(...newTasks);

    // If this is the user's first active subject, ensure Day 1 is active
    if (state.subjects.length === 1) {
      state.currentSprintDay = 1;
      viewDay = 1;
      state.day1Date = getTodayStr();
    }

    saveState(state);
    dayInputsMemory = {}; // clear form cache

    alert(`Subject "${name}" added successfully with ${newTasks.length} topics across ${sprintDays} days!`);

    // Switch to Today's Focus on Day 1
    viewDay = 1;
    window.location.hash = '#/daily';
    render();
  };

  /**
   * addT(id): Add single task to subject for a specific day.
   */
  window.addT = function (subjectId) {
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;
    const title = prompt(`Add task for ${sub.name}:`);
    if (!title || !title.trim()) return;

    const defaultDay = viewDay || state.currentSprintDay || 1;
    const dayStr = prompt(`Enter Sprint Day (1 to ${sub.sprintDays || 30}):`, defaultDay);
    if (dayStr === null) return;
    const day = Math.max(1, parseInt(dayStr, 10) || defaultDay);

    state.tasks.push({
      id: 'tsk_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      subjectId: subjectId,
      title: title.trim(),
      day: day,
      status: 'todo',
      note: ''
    });

    saveState(state);
    render();
  };

  /**
   * delS(id): Confirm & delete subject + all its tasks.
   */
  window.delS = function (subjectId) {
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;
    const confirmed = confirm(`Are you sure you want to delete "${sub.name}" and all of its scheduled tasks?`);
    if (!confirmed) return;

    state.subjects = state.subjects.filter(s => s.id !== subjectId);
    state.tasks = state.tasks.filter(t => t.subjectId !== subjectId);

    if (state.subjects.length === 0) {
      state.currentSprintDay = 1;
      viewDay = 1;
      state.day1Date = getTodayStr();
    }

    saveState(state);
    render();
  };

  /**
   * resAll(): 1-Click Auto-Reschedule All Backlog tasks.
   */
  window.resAll = function () {
    const backlog = state.tasks.filter(t => t.status === 'backlog');
    if (backlog.length === 0) {
      alert('No tasks in the backlog to reschedule.');
      return;
    }

    const todaySprint = state.currentSprintDay || getCurrentSprintDay(state.day1Date);
    const next5Days = [1, 2, 3, 4, 5].map(offset => todaySprint + offset);

    const dayCounts = {};
    next5Days.forEach(d => {
      dayCounts[d] = state.tasks.filter(t => t.day === d && t.status === 'todo').length;
    });

    backlog.forEach(t => {
      let chosenDay = next5Days[0];
      let minTasks = dayCounts[chosenDay];

      next5Days.forEach(d => {
        if (dayCounts[d] < minTasks) {
          minTasks = dayCounts[d];
          chosenDay = d;
        }
      });

      t.day = chosenDay;
      t.status = 'todo';
      dayCounts[chosenDay]++;
    });

    saveState(state);
    alert(`Successfully rescheduled ${backlog.length} backlog tasks across Days ${next5Days[0]} through ${next5Days[4]}!`);
    render();
  };

  /**
   * mv(id): Move one backlog task to 'todo' on current sprint day.
   */
  window.mv = function (id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.status = 'todo';
    task.day = state.currentSprintDay || getCurrentSprintDay(state.day1Date);
    saveState(state);
    render();
  };

  /**
   * pm(mode): Switch Pomodoro mode.
   */
  window.pm = function (mode) {
    if (pomodoro.intervalId) {
      clearInterval(pomodoro.intervalId);
      pomodoro.intervalId = null;
    }
    pomodoro.isRunning = false;

    if (mode === 'short' || mode === 5) {
      pomodoro.mode = 'short';
      pomodoro.totalSeconds = 5 * 60;
    } else if (mode === 'long' || mode === 15) {
      pomodoro.mode = 'long';
      pomodoro.totalSeconds = 15 * 60;
    } else {
      pomodoro.mode = 'focus';
      pomodoro.totalSeconds = 25 * 60;
    }
    pomodoro.remainingSeconds = pomodoro.totalSeconds;
    syncPomodoroUI();
  };

  /**
   * pt(): Start / pause Pomodoro countdown.
   */
  window.pt = function () {
    if (pomodoro.remainingSeconds <= 0) return;

    if (pomodoro.isRunning) {
      pomodoro.isRunning = false;
      if (pomodoro.intervalId) {
        clearInterval(pomodoro.intervalId);
        pomodoro.intervalId = null;
      }
    } else {
      pomodoro.isRunning = true;
      pomodoro.targetEndTime = Date.now() + pomodoro.remainingSeconds * 1000;
      pomodoro.intervalId = setInterval(updatePomodoro, 500);
    }
    syncPomodoroUI();
  };

  /**
   * pr(): Reset Pomodoro timer.
   */
  window.pr = function () {
    window.pm(pomodoro.mode);
  };

  /**
   * th(): Toggle dark/light theme.
   */
  window.th = function () {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    if (isDark) {
      html.classList.remove('dark');
      state.theme = 'light';
    } else {
      html.classList.add('dark');
      state.theme = 'dark';
    }
    saveState(state);
    render();
  };

  /**
   * ex(): Export full data as JSON file.
   */
  window.ex = function () {
    const jsonStr = JSON.stringify(state, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studysprint-backup-${getTodayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * im(file): Restore backup JSON with validation.
   */
  window.im = function (fileInput) {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || !Array.isArray(parsed.tasks) || !Array.isArray(parsed.subjects)) {
          alert('Invalid backup file! Missing required sprint structure.');
          return;
        }
        state = parsed;
        if (!state.currentSprintDay) {
          state.currentSprintDay = 1;
        }
        viewDay = state.currentSprintDay;
        saveState(state);
        alert('StudySprint data successfully restored from backup!');
        window.location.hash = '#/dashboard';
        render();
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  /**
   * rst(): Factory reset everything.
   */
  window.rst = function () {
    const confirmed = confirm('WARNING: This will erase all courses, tasks, and streaks. Day 1 will restart fresh. Continue?');
    if (!confirmed) return;

    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    saveState(state);
    viewDay = 1;
    window.location.hash = '#/dashboard';
    alert('StudySprint has been reset! Day 1 is now active.');
    render();
  };

  // --- Dynamic Day-by-Day Form Builder ---

  function captureDayInputsInMemory() {
    const fields = document.querySelectorAll('.day-input-field');
    fields.forEach(f => {
      const dayNum = f.getAttribute('data-day');
      if (dayNum) {
        dayInputsMemory[dayNum] = f.value;
      }
    });
  }

  window.renderDayInputs = function (totalDays) {
    captureDayInputsInMemory();
    const count = Math.max(1, Math.min(180, parseInt(totalDays, 10) || 17));
    const container = document.getElementById('day-by-day-container');
    if (!container) return;

    let html = '';
    for (let d = 1; d <= count; d++) {
      const val = dayInputsMemory[d] || '';
      html += `
        <div class="p-3.5 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 font-extrabold font-mono text-xs flex items-center justify-center">${d}</span>
              Day ${d} Syllabus
            </span>
            <span class="text-[10px] text-slate-400">Day ${d} topics</span>
          </div>
          <textarea id="day-input-${d}" data-day="${d}" oninput="dayInputsMemory[${d}] = this.value" class="day-input-field w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 font-sans" rows="2" placeholder="e.g. Chapter or topics for Day ${d} (one per line)">${val}</textarea>
        </div>
      `;
    }
    container.innerHTML = html;
  };

  window.onTimelineChange = function (val) {
    const wrap = document.getElementById('sub-custom-days-wrapper');
    const customInput = document.getElementById('sub-custom-days');
    let days = 20;

    if (val === 'custom') {
      if (wrap) wrap.classList.remove('hidden');
      days = parseInt(customInput ? customInput.value : 17, 10) || 17;
    } else {
      if (wrap) wrap.classList.add('hidden');
      days = parseInt(val, 10) || 20;
    }

    const modeDayRadio = document.getElementById('sub-mode-day');
    if (modeDayRadio && modeDayRadio.checked) {
      window.renderDayInputs(days);
    }
  };

  window.onCustomDaysInput = function (val) {
    const count = parseInt(val, 10) || 17;
    const modeDayRadio = document.getElementById('sub-mode-day');
    if (modeDayRadio && modeDayRadio.checked) {
      window.renderDayInputs(count);
    }
  };

  window.onModeToggle = function (mode) {
    const autoWrap = document.getElementById('sub-auto-wrapper');
    const dayWrap = document.getElementById('sub-day-by-day-wrapper');
    const timelineSelect = document.getElementById('sub-timeline');
    const customDaysInput = document.getElementById('sub-custom-days');

    let days = 20;
    if (timelineSelect) {
      if (timelineSelect.value === 'custom') {
        days = parseInt(customDaysInput ? customDaysInput.value : 17, 10) || 17;
      } else {
        days = parseInt(timelineSelect.value, 10) || 20;
      }
    }

    if (mode === 'auto') {
      if (autoWrap) autoWrap.classList.remove('hidden');
      if (dayWrap) dayWrap.classList.add('hidden');
    } else {
      if (autoWrap) autoWrap.classList.add('hidden');
      if (dayWrap) dayWrap.classList.remove('hidden');
      window.renderDayInputs(days);
    }
  };

  // --- UI Renderers & Views ---

  function applyTheme() {
    const html = document.documentElement;
    if (state.theme === 'light') {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
  }

  function renderSidebar(currentRoute) {
    const currentSprintDay = state.currentSprintDay || 1;
    const streak = getStreak(state.history);
    const backlogCount = state.tasks.filter(t => t.status === 'backlog').length;

    // Badge reflects viewDay when in daily tab, or currentSprintDay
    const dailyBadge = currentRoute === 'daily' ? `Day ${viewDay}` : `Day ${currentSprintDay}`;

    const navItems = [
      { id: 'dashboard', hash: '#/dashboard', icon: 'layout-grid', label: 'Dashboard' },
      { id: 'daily', hash: '#/daily', icon: 'check-square', label: "Today's Focus", badge: dailyBadge },
      { id: 'subjects', hash: '#/subjects', icon: 'book-open', label: 'Subjects & Sprints', badge: `${state.subjects.length}` },
      { id: 'backlog', hash: '#/backlog', icon: 'inbox', label: 'Backlog Room', badge: backlogCount > 0 ? `${backlogCount}` : null, badgeColor: 'bg-amber-500/20 text-amber-500' },
      { id: 'pomodoro', hash: '#/pomodoro', icon: 'timer', label: 'Pomodoro Focus', badge: '25m' },
      { id: 'analytics', hash: '#/analytics', icon: 'bar-chart-3', label: 'Analytics' },
      { id: 'settings', hash: '#/settings', icon: 'settings', label: 'Settings & Backup' }
    ];

    const navHtml = navItems.map(item => {
      const isActive = currentRoute === item.id;
      const activeClass = isActive
        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25 font-bold'
        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white font-medium';

      const badgeHtml = item.badge
        ? `<span class="ml-auto text-xs px-2 py-0.5 rounded-full ${item.badgeColor || (isActive ? 'bg-white/20 text-white' : 'bg-brand-500/10 text-brand-600 dark:text-brand-400')} font-semibold">${item.badge}</span>`
        : '';

      return `
        <a href="${item.hash}" class="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-150 ${activeClass}">
          <i data-lucide="${item.icon}" class="w-4 h-4 shrink-0"></i>
          <span class="text-xs truncate">${item.label}</span>
          ${badgeHtml}
        </a>
      `;
    }).join('');

    return `
      <!-- Desktop & Tablet Sidebar -->
      <aside class="w-full md:w-64 bg-white dark:bg-surface-darkcard border-b md:border-b-0 md:border-r border-slate-200 dark:border-surface-darkborder shrink-0 flex flex-col md:min-h-screen">
        <div class="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <a href="#/dashboard" class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white shadow-md shadow-brand-500/30">
              <i data-lucide="layers" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                StudySprint
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">V5</span>
              </div>
              <div class="text-[10px] text-slate-400 font-medium">Personal Study OS</div>
            </div>
          </a>
          <button onclick="th()" class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Toggle Dark/Light Mode">
            <i data-lucide="${state.theme === 'light' ? 'moon' : 'sun'}" class="w-4 h-4"></i>
          </button>
        </div>

        <!-- Quick Sprint Pill with Direct Day Adjustment -->
        <div class="p-4 hidden md:block">
          <div class="bg-gradient-to-br from-brand-50 to-slate-50 dark:from-surface-dark/80 dark:to-surface-darkcard p-3 rounded-2xl border border-brand-500/20 shadow-sm">
            <div class="flex items-center justify-between text-[11px] mb-1.5">
              <span class="text-slate-500 font-medium flex items-center gap-1">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-brand-500"></i> Sprint Day
              </span>
              <button onclick="promptChangeSprintDay()" class="font-bold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1" title="Click to change active sprint day">
                Day ${currentSprintDay} <i data-lucide="edit-2" class="w-2.5 h-2.5"></i>
              </button>
            </div>
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-500 font-medium flex items-center gap-1">
                🔥 Streak
              </span>
              <span class="font-bold text-amber-500">${streak} Days</span>
            </div>
          </div>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          ${navHtml}
        </nav>

        <!-- Footer / Backup Indicator -->
        <div class="p-4 border-t border-slate-100 dark:border-slate-800 hidden md:block">
          <div class="flex items-center justify-between text-[11px] text-slate-400">
            <span>Offline-First (Local)</span>
            <button onclick="ex()" class="hover:text-brand-500 font-medium flex items-center gap-1">
              <i data-lucide="download" class="w-3 h-3"></i> Backup
            </button>
          </div>
        </div>
      </aside>
    `;
  }

  // --- Screen 1: Dashboard ---
  function renderDashboard() {
    const currentSprintDay = state.currentSprintDay || 1;
    const streak = getStreak(state.history);
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'done').length;
    const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const backlogTasks = state.tasks.filter(t => t.status === 'backlog');

    // Today's tasks (day === currentSprintDay and not in backlog)
    const todayTasks = state.tasks.filter(t => t.day === currentSprintDay && t.status !== 'backlog');
    const todayDone = todayTasks.filter(t => t.status === 'done').length;
    const todayProgress = todayTasks.length > 0 ? Math.round((todayDone / todayTasks.length) * 100) : 0;

    const backlogBanner = backlogTasks.length > 0 ? `
      <div class="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <i data-lucide="alert-triangle" class="w-5 h-5"></i>
          </div>
          <div>
            <h4 class="font-bold text-xs text-amber-600 dark:text-amber-400">Backlog Alert: ${backlogTasks.length} topics pending reschedule</h4>
            <p class="text-[11px] text-slate-500 dark:text-slate-400">Don't fall behind! Use 1-Click Auto-Reschedule to distribute them over the next 5 days.</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button onclick="resAll()" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5">
            <i data-lucide="zap" class="w-3.5 h-3.5"></i> Auto-Reschedule
          </button>
          <a href="#/backlog" class="px-3 py-1.5 rounded-xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
            Open Room
          </a>
        </div>
      </div>
    ` : '';

    const priorityTasksHtml = todayTasks.length > 0 ? todayTasks.map(task => {
      const sub = state.subjects.find(s => s.id === task.subjectId);
      const isDone = task.status === 'done';
      return `
        <div class="p-3.5 rounded-2xl border ${isDone ? 'bg-brand-50/30 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/40' : 'bg-white dark:bg-surface-darkcard border-slate-200 dark:border-surface-darkborder'} flex items-start justify-between gap-3 transition-all">
          <div class="flex items-start gap-3 min-w-0">
            <button onclick="done('${task.id}')" class="mt-0.5 w-5 h-5 rounded-lg border-2 ${isDone ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'} flex items-center justify-center shrink-0 transition-colors">
              ${isDone ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${sub ? sub.name : 'General'}</span>
                ${task.note ? `<span class="text-[10px] text-brand-600 dark:text-brand-400 font-medium">📝 Note attached</span>` : ''}
              </div>
              <p class="text-xs font-semibold ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'}">${task.title}</p>
              ${task.note ? `<p class="text-[11px] text-slate-400 mt-1 italic font-mono bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">"${task.note}"</p>` : ''}
            </div>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button onclick="nd('${task.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors" title="Reschedule / Not Done">
              <i data-lucide="calendar-clock" class="w-4 h-4"></i>
            </button>
            <button onclick="note('${task.id}')" class="p-1.5 rounded-lg text-slate-400 hover:text-brand-500 hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-colors" title="Add / Edit Note">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <i data-lucide="sparkles" class="w-8 h-8 text-brand-500 mx-auto mb-2 opacity-80"></i>
        <h4 class="text-xs font-bold text-slate-700 dark:text-slate-300">All clear for Today (Day ${currentSprintDay})!</h4>
        <p class="text-[11px] text-slate-400 mt-0.5">Explore your syllabus or add a new topic to stay ahead.</p>
        <button onclick="gd(${currentSprintDay + 1})" class="mt-3 px-3 py-1.5 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors">
          Preview Day ${currentSprintDay + 1} →
        </button>
      </div>
    `;

    const subjectCardsHtml = state.subjects.length > 0 ? state.subjects.map(sub => {
      const sTasks = state.tasks.filter(t => t.subjectId === sub.id);
      const sDone = sTasks.filter(t => t.status === 'done').length;
      const sPct = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;
      return `
        <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">${sub.sprintDays} Days Sprint</span>
              <span class="text-xs font-mono font-bold text-slate-500">${sPct}%</span>
            </div>
            <h4 class="font-bold text-sm text-slate-900 dark:text-white">${sub.name}</h4>
            <p class="text-[11px] text-slate-400 mt-0.5">${sDone}/${sTasks.length} topics mastered</p>
          </div>
          <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mr-3">
              <div class="bg-brand-500 h-full rounded-full transition-all duration-300" style="width: ${sPct}%"></div>
            </div>
            <button onclick="gd(1)" class="text-xs font-bold text-brand-500 hover:text-brand-600 shrink-0">Study →</button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="p-6 text-center bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
        No active subjects yet. Click "+ New Course" to add one!
      </div>
    `;

    return `
      <div class="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Personal Study Dashboard</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Syllabus pacing, active sprint progress, and daily execution.</p>
          </div>
          <div class="flex items-center gap-2">
            <button onclick="gd(${currentSprintDay})" class="px-3.5 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center gap-1.5">
              <i data-lucide="play" class="w-3.5 h-3.5"></i> Open Today's Focus (Day ${currentSprintDay})
            </button>
          </div>
        </div>

        ${backlogBanner}

        <!-- 4 Metric Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overall Progress</div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-slate-900 dark:text-white">${overallProgress}%</div>
            <div class="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div class="bg-brand-500 h-full rounded-full" style="width: ${overallProgress}%"></div>
            </div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Active Sprint</span>
              <button onclick="promptChangeSprintDay()" class="text-[10px] text-brand-500 hover:underline">Change</button>
            </div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-brand-500">Day ${currentSprintDay}</div>
            <div class="text-[11px] text-slate-400 mt-1">${todayDone}/${todayTasks.length} topics finished today</div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Study Streak</div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-amber-500 flex items-center gap-1.5">
              🔥 ${streak} <span class="text-xs font-sans font-bold text-slate-400">days</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">Consistency score active</div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Backlog Room</div>
            <div class="mt-1 text-2xl font-extrabold font-mono ${backlogTasks.length > 0 ? 'text-amber-500' : 'text-emerald-500'}">
              ${backlogTasks.length} <span class="text-xs font-sans font-bold text-slate-400">pending</span>
            </div>
            <div class="text-[11px] text-slate-400 mt-1">${backlogTasks.length === 0 ? 'Zero backlog! Great job.' : 'Requires rescheduling'}</div>
          </div>
        </div>

        <!-- Two Columns: Priority Today & Active Courses -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2 space-y-3">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="target" class="w-4 h-4 text-brand-500"></i> Priority Topics for Today (Day ${currentSprintDay})
                </h3>
              </div>
              <span class="text-xs font-mono font-bold text-brand-500">${todayProgress}% done</span>
            </div>
            <div class="space-y-2">
              ${priorityTasksHtml}
            </div>
          </div>

          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <i data-lucide="book-open" class="w-4 h-4 text-brand-500"></i> Active Courses (${state.subjects.length})
              </h3>
              <a href="#/subjects" class="text-xs font-bold text-brand-500 hover:underline">+ New Course</a>
            </div>
            <div class="space-y-3">
              ${subjectCardsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Screen 2: Today's Focus ---
  function renderDailyFocus() {
    const currentSprintDay = state.currentSprintDay || 1;
    const dayTasks = state.tasks.filter(t => t.day === viewDay && t.status !== 'backlog');
    const dayDone = dayTasks.filter(t => t.status === 'done').length;
    const dayProgress = dayTasks.length > 0 ? Math.round((dayDone / dayTasks.length) * 100) : 0;

    // Day Selector Options (cover at least 30 days or max sprint day)
    let maxDay = 30;
    state.subjects.forEach(s => { if (s.sprintDays > maxDay) maxDay = s.sprintDays; });
    state.tasks.forEach(t => { if (t.day > maxDay) maxDay = t.day; });

    let dayOptionsHtml = '';
    for (let d = 1; d <= maxDay; d++) {
      const isToday = d === currentSprintDay;
      const isSelected = d === viewDay;
      const label = `Day ${d}${isToday ? ' (Today 🔥)' : ''}`;
      dayOptionsHtml += `<option value="${d}" ${isSelected ? 'selected' : ''}>${label}</option>`;
    }

    const isViewingToday = viewDay === currentSprintDay;

    const tasksHtml = dayTasks.length > 0 ? dayTasks.map(task => {
      const sub = state.subjects.find(s => s.id === task.subjectId);
      const isDone = task.status === 'done';
      return `
        <div class="p-4 rounded-2xl border ${isDone ? 'bg-brand-50/20 dark:bg-brand-950/20 border-brand-200 dark:border-brand-900/40' : 'bg-white dark:bg-surface-darkcard border-slate-200 dark:border-surface-darkborder shadow-sm'} flex items-start justify-between gap-4 transition-all">
          <div class="flex items-start gap-3.5 min-w-0">
            <button onclick="done('${task.id}')" class="mt-0.5 w-6 h-6 rounded-xl border-2 ${isDone ? 'bg-brand-500 border-brand-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-brand-500'} flex items-center justify-center shrink-0 transition-colors shadow-sm">
              ${isDone ? '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>' : ''}
            </button>
            <div class="min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">${sub ? sub.name : 'General'}</span>
                ${isDone ? '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Completed</span>' : ''}
              </div>
              <p class="text-xs md:text-sm font-bold ${isDone ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}">${task.title}</p>
              ${task.note ? `<p class="text-xs text-slate-500 dark:text-slate-400 mt-1.5 italic font-mono bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800">Note: ${task.note}</p>` : ''}
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button onclick="note('${task.id}')" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 text-slate-600 dark:text-slate-400 hover:text-brand-500 text-xs font-semibold flex items-center gap-1 transition-colors" title="Attach Note">
              <i data-lucide="edit-3" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">${task.note ? 'Edit Note' : 'Add Note'}</span>
            </button>
            <button onclick="nd('${task.id}')" class="px-2.5 py-1.5 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 hover:bg-amber-100/50 transition-colors" title="Not Done / Reschedule">
              <i data-lucide="clock" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Not Done</span>
            </button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="p-12 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-500 flex items-center justify-center mx-auto">
          <i data-lucide="calendar" class="w-6 h-6"></i>
        </div>
        <h3 class="font-bold text-sm text-slate-800 dark:text-slate-200">No topics scheduled for Day ${viewDay}</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">Add a topic specifically for this sprint day or configure your subject sprint in Subjects & Sprints.</p>
        <div class="pt-2">
          ${state.subjects.length > 0 ? `
            <button onclick="addT('${state.subjects[0].id}')" class="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors">
              + Add Topic for Day ${viewDay}
            </button>
          ` : `
            <a href="#/subjects" class="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors inline-block">
              + Create Subject Sprint First
            </a>
          `}
        </div>
      </div>
    `;

    return `
      <div class="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <!-- Top Day Navigation Header -->
        <div class="p-4 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button onclick="gd(${viewDay - 1})" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" ${viewDay <= 1 ? 'disabled opacity-40 cursor-not-allowed' : ''} title="Previous Sprint Day">
              <i data-lucide="chevron-left" class="w-5 h-5"></i>
            </button>
            <div class="flex items-center gap-2">
              <select onchange="gd(this.value, true)" class="bg-slate-100 dark:bg-slate-800 border-0 font-bold text-sm rounded-xl px-3 py-2 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-brand-500">
                ${dayOptionsHtml}
              </select>

              ${isViewingToday ? `
                <span class="px-2.5 py-1.5 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold text-xs flex items-center gap-1">
                  🔥 Active Today
                </span>
              ` : `
                <button onclick="setAsToday(${viewDay})" class="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5" title="Set Day ${viewDay} as your active study day">
                  <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> Set as Today (Day ${viewDay})
                </button>
                <button onclick="gd(${currentSprintDay})" class="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-bold text-xs transition-colors">
                  Jump to Day ${currentSprintDay}
                </button>
              `}
            </div>
            <button onclick="gd(${viewDay + 1})" class="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Next Sprint Day">
              <i data-lucide="chevron-right" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div class="text-right">
              <div class="text-xs font-mono font-bold text-slate-900 dark:text-white">${dayDone} / ${dayTasks.length} Done</div>
              <div class="text-[10px] text-slate-400">${dayProgress}% completed</div>
            </div>
            <div class="w-16 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div class="bg-brand-500 h-full rounded-full transition-all duration-300" style="width: ${dayProgress}%"></div>
            </div>
          </div>
        </div>

        <!-- Task List Header -->
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              Day ${viewDay} Syllabus Focus
              ${isViewingToday ? '<span class="text-xs px-2 py-0.5 rounded-full bg-brand-500 text-white font-bold">Active Today</span>' : ''}
            </h2>
            <p class="text-xs text-slate-400 mt-0.5">Execute your scheduled curriculum. Check off topics as you master them.</p>
          </div>
          ${state.subjects.length > 0 ? `
            <button onclick="addT('${state.subjects[0].id}')" class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Topic
            </button>
          ` : ''}
        </div>

        <!-- Task List Items -->
        <div class="space-y-3">
          ${tasksHtml}
        </div>
      </div>
    `;
  }

  // --- Screen 3: Subjects & Sprints ---
  function renderSubjects() {
    const subjectsListHtml = state.subjects.length > 0 ? state.subjects.map(sub => {
      const sTasks = state.tasks.filter(t => t.subjectId === sub.id);
      const sDone = sTasks.filter(t => t.status === 'done').length;
      const sPct = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;
      return `
        <div class="p-5 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400">${sub.sprintDays} Days Sprint</span>
                ${sub.examDate ? `<span class="text-[10px] font-medium text-slate-400">Exam: ${sub.examDate}</span>` : ''}
              </div>
              <h3 class="text-base font-extrabold text-slate-900 dark:text-white">${sub.name}</h3>
            </div>
            <button onclick="delS('${sub.id}')" class="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors" title="Delete Course">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>

          <div>
            <div class="flex items-center justify-between text-xs mb-1.5">
              <span class="text-slate-400 font-medium">${sDone} of ${sTasks.length} topics finished</span>
              <span class="font-mono font-bold text-brand-500">${sPct}%</span>
            </div>
            <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div class="bg-brand-500 h-full rounded-full transition-all duration-300" style="width: ${sPct}%"></div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button onclick="addT('${sub.id}')" class="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-brand-500 flex items-center gap-1 transition-colors">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Task
            </button>
            <button onclick="gd(1)" class="text-xs font-bold text-brand-500 hover:text-brand-600">Study Now →</button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="p-8 text-center bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400">
        <i data-lucide="book-marked" class="w-8 h-8 mx-auto mb-2 opacity-60"></i>
        <p class="text-xs font-bold">No active courses configured yet.</p>
        <p class="text-[11px] mt-0.5">Use the form on the right to configure your first syllabus sprint.</p>
      </div>
    `;

    return `
      <div class="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Subjects & Sprints</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Configure your syllabus breakdown, custom sprint days (e.g. 17 days), and daily curricula.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <!-- Left: Active Courses -->
          <div class="lg:col-span-2 space-y-4">
            <h2 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="layers" class="w-4 h-4 text-brand-500"></i> My Active Courses (${state.subjects.length})
            </h2>
            <div class="space-y-4">
              ${subjectsListHtml}
            </div>
          </div>

          <!-- Right: Add Course Form with Day-by-Day Syllabus Options -->
          <div class="lg:col-span-3">
            <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-5">
              <div>
                <h3 class="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <i data-lucide="plus-circle" class="w-5 h-5 text-brand-500"></i> Add New Subject Sprint
                </h3>
                <p class="text-xs text-slate-400 mt-0.5">Set up syllabus topics for every single day or auto-distribute across your sprint timeline.</p>
              </div>

              <div class="space-y-4">
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Subject Name</label>
                  <input id="sub-name" type="text" placeholder="e.g. Mathematics II, Organic Chemistry, World History" class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Sprint Timeline</label>
                    <select id="sub-timeline" onchange="onTimelineChange(this.value)" class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="custom" selected>⚙️ Custom Number of Days (e.g. 17)</option>
                      <option value="20">⚡ 20 Days Fast Sprint</option>
                      <option value="30">📅 30 Days Standard Sprint</option>
                    </select>
                  </div>

                  <div id="sub-custom-days-wrapper">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Enter Custom Days</label>
                    <input id="sub-custom-days" type="number" min="1" max="180" value="17" placeholder="e.g. 17" oninput="onCustomDaysInput(this.value)" class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-bold text-brand-600 dark:text-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>

                  <div class="sm:col-span-2">
                    <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target Exam Date (Optional)</label>
                    <input id="sub-exam" type="date" class="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>

                <!-- Distribution Mode Selection -->
                <div>
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Curriculum Setup Mode</label>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 flex items-start gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-900/30">
                      <input type="radio" id="sub-mode-day" name="sub-mode" value="day" checked onchange="onModeToggle('day')" class="mt-1 text-brand-500 focus:ring-brand-500" />
                      <div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          🎯 Day-by-Day Options
                          <span class="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold">Recommended</span>
                        </div>
                        <div class="text-[11px] text-slate-400">Generates individual Day 1, Day 2, ... Day N syllabus fields.</div>
                      </div>
                    </label>

                    <label class="p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 flex items-start gap-3 cursor-pointer bg-slate-50/50 dark:bg-slate-900/30">
                      <input type="radio" id="sub-mode-auto" name="sub-mode" value="auto" onchange="onModeToggle('auto')" class="mt-1 text-brand-500 focus:ring-brand-500" />
                      <div>
                        <div class="text-xs font-bold text-slate-800 dark:text-slate-200">⚡ Auto-Distribute (Bulk)</div>
                        <div class="text-[11px] text-slate-400">Paste all topics in one box, auto-divided across days.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <!-- Day-by-Day Individual Inputs Container -->
                <div id="sub-day-by-day-wrapper" class="space-y-2">
                  <div class="flex items-center justify-between">
                    <label class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Day-by-Day Syllabus Plan
                    </label>
                    <span class="text-[10px] text-brand-600 dark:text-brand-400 font-bold">Options for each day</span>
                  </div>
                  <div id="day-by-day-container" class="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                    <!-- Rendered dynamically by renderDayInputs -->
                  </div>
                </div>

                <!-- Auto-Distribute Textarea (Hidden by default when Day-by-Day is selected) -->
                <div id="sub-auto-wrapper" class="hidden space-y-1.5">
                  <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-500">Syllabus Topics (One per line)</label>
                  <textarea id="sub-syllabus" rows="7" placeholder="Paste your chapters, topics, or problem sets here:&#10;Chapter 1: Foundations & Limits&#10;Chapter 2: Derivative Applications&#10;Chapter 3: Integration Techniques" class="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500"></textarea>
                  <p class="text-[11px] text-slate-400">The engine divides these topics mathematically across your sprint days.</p>
                </div>

                <button onclick="addSub()" class="w-full py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-xs shadow-lg shadow-brand-500/25 transition-all flex items-center justify-center gap-2">
                  <i data-lucide="check" class="w-4 h-4"></i> Create Subject Sprint
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Screen 4: Backlog Room ---
  function renderBacklog() {
    const backlogTasks = state.tasks.filter(t => t.status === 'backlog');

    const backlogItemsHtml = backlogTasks.length > 0 ? backlogTasks.map(task => {
      const sub = state.subjects.find(s => s.id === task.subjectId);
      return `
        <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">${sub ? sub.name : 'General'}</span>
              <span class="text-[10px] font-semibold text-amber-500">Original: Day ${task.day}</span>
            </div>
            <h4 class="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">${task.title}</h4>
            ${task.note ? `<p class="text-xs text-slate-400 mt-1 italic font-mono">"${task.note}"</p>` : ''}
          </div>

          <div class="flex items-center gap-2 shrink-0">
            <button onclick="mv('${task.id}')" class="px-3 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center gap-1.5">
              <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i> Move to Today
            </button>
            <button onclick="nd('${task.id}')" class="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 text-slate-600 dark:text-slate-300 text-xs font-semibold">
              Reschedule
            </button>
          </div>
        </div>
      `;
    }).join('') : `
      <div class="p-12 text-center bg-emerald-500/5 rounded-3xl border border-dashed border-emerald-500/20 space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <i data-lucide="check-check" class="w-6 h-6"></i>
        </div>
        <h3 class="font-bold text-sm text-slate-900 dark:text-white">All Caught Up! Backlog is Empty</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">You have no deferred topics. Continue your daily focus or preview upcoming sprint milestones.</p>
        <div class="pt-2">
          <button onclick="gd(1)" class="px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs hover:bg-brand-600 transition-colors inline-block">
            Go to Today's Focus →
          </button>
        </div>
      </div>
    `;

    return `
      <div class="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Backlog Room</h1>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tasks deferred during study sessions stay safely stored here until recovered.</p>
          </div>
          ${backlogTasks.length > 0 ? `
            <button onclick="resAll()" class="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2">
              <i data-lucide="zap" class="w-4 h-4"></i> ⚡ 1-Click Auto-Reschedule All
            </button>
          ` : ''}
        </div>

        <div class="space-y-3">
          ${backlogItemsHtml}
        </div>
      </div>
    `;
  }

  // --- Screen 5: Pomodoro Focus ---
  function renderPomodoro() {
    const min = String(Math.floor(pomodoro.remainingSeconds / 60)).padStart(2, '0');
    const sec = String(pomodoro.remainingSeconds % 60).padStart(2, '0');
    const timeStr = `${min}:${sec}`;

    return `
      <div class="max-w-xl mx-auto p-4 md:p-8 space-y-8 text-center">
        <div>
          <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Pomodoro Focus Timer</h1>
          <p class="text-xs text-slate-400 mt-1">Deep work intervals with automated rest intervals.</p>
        </div>

        <!-- Mode Selectors -->
        <div class="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800">
          <button onclick="pm('focus')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${pomodoro.mode === 'focus' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            25m Focus
          </button>
          <button onclick="pm('short')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${pomodoro.mode === 'short' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            5m Short Break
          </button>
          <button onclick="pm('long')" class="px-4 py-2 rounded-xl text-xs font-bold transition-all ${pomodoro.mode === 'long' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}">
            15m Long Break
          </button>
        </div>

        <!-- Circular Timer Display -->
        <div class="relative w-64 h-64 mx-auto flex items-center justify-center">
          <svg class="w-full h-full transform -rotate-90">
            <circle cx="128" cy="128" r="110" stroke="currentColor" stroke-width="10" fill="transparent" class="text-slate-200 dark:text-slate-800"></circle>
            <circle id="pomo-progress-ring" cx="128" cy="128" r="110" stroke="currentColor" stroke-width="10" stroke-linecap="round" fill="transparent" class="text-brand-500 transition-all duration-300" stroke-dasharray="${2 * Math.PI * 110}" stroke-dashoffset="${2 * Math.PI * 110 * (1 - (pomodoro.totalSeconds - pomodoro.remainingSeconds) / pomodoro.totalSeconds)}"></circle>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div id="pomo-display-time" class="text-4xl md:text-5xl font-extrabold font-mono text-slate-900 dark:text-white tracking-tighter">${timeStr}</div>
            <div class="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">${pomodoro.mode}</div>
          </div>
        </div>

        <!-- Controls -->
        <div class="flex items-center justify-center gap-4">
          <button onclick="pt()" id="pomo-main-btn" class="px-6 py-3.5 rounded-2xl bg-brand-500 hover:bg-brand-600 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 transition-all flex items-center gap-2">
            <i data-lucide="${pomodoro.isRunning ? 'pause' : 'play'}" class="w-5 h-5"></i>
            <span>${pomodoro.isRunning ? 'Pause Session' : 'Start Focus'}</span>
          </button>
          <button onclick="pr()" class="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors" title="Reset Timer">
            <i data-lucide="rotate-ccw" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder inline-flex items-center gap-3">
          <i data-lucide="award" class="w-5 h-5 text-amber-500"></i>
          <span class="text-xs font-bold text-slate-700 dark:text-slate-300">Completed Sessions Today: <span class="font-mono text-brand-500">${pomodoro.completedSessions}</span></span>
        </div>
      </div>
    `;
  }

  // --- Screen 6: Analytics ---
  function renderAnalytics() {
    const streak = getStreak(state.history);
    const totalTasks = state.tasks.length;
    const completedTasks = state.tasks.filter(t => t.status === 'done').length;
    const backlogTasks = state.tasks.filter(t => t.status === 'backlog').length;
    const currentSprintDay = state.currentSprintDay || 1;

    const velocity = currentSprintDay > 0 ? (completedTasks / currentSprintDay).toFixed(1) : 0;

    const heatmapDays = [];
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    for (let i = 29; i >= 0; i--) {
      const d = new Date(todayMidnight);
      d.setDate(d.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      const ds = `${y}-${m}-${dayNum}`;
      const count = state.history[ds] || 0;
      heatmapDays.push({ date: ds, count: count });
    }

    const heatmapSquaresHtml = heatmapDays.map(item => {
      let bg = 'bg-slate-100 dark:bg-slate-800/80';
      if (item.count === 1) bg = 'bg-brand-300 dark:bg-brand-900';
      else if (item.count === 2) bg = 'bg-brand-400 dark:bg-brand-700';
      else if (item.count === 3) bg = 'bg-brand-500 dark:bg-brand-600';
      else if (item.count >= 4) bg = 'bg-brand-600 dark:bg-brand-400';

      return `
        <div class="w-6 h-6 rounded-md ${bg} transition-transform hover:scale-110 cursor-pointer" title="${item.date}: ${item.count} topics completed"></div>
      `;
    }).join('');

    const subjectBreakdownHtml = state.subjects.map(sub => {
      const sTasks = state.tasks.filter(t => t.subjectId === sub.id);
      const sDone = sTasks.filter(t => t.status === 'done').length;
      const sPct = sTasks.length > 0 ? Math.round((sDone / sTasks.length) * 100) : 0;
      return `
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-slate-800 dark:text-slate-200">${sub.name}</span>
            <span class="font-mono text-brand-500">${sDone}/${sTasks.length} (${sPct}%)</span>
          </div>
          <div class="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div class="bg-brand-500 h-full rounded-full transition-all duration-300" style="width: ${sPct}%"></div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Analytics & Syllabus Insights</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Historical consistency metrics, velocity rates, and coverage distribution.</p>
        </div>

        <!-- 4 Metrics -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Velocity</div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-slate-900 dark:text-white">${velocity} <span class="text-xs font-sans font-normal text-slate-400">topics/day</span></div>
            <div class="text-[11px] text-slate-400 mt-1">Average daily throughput</div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Mastered Topics</div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-brand-500">${completedTasks} / ${totalTasks}</div>
            <div class="text-[11px] text-slate-400 mt-1">Topics marked done</div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Current Streak</div>
            <div class="mt-1 text-2xl font-extrabold font-mono text-amber-500">🔥 ${streak} Days</div>
            <div class="text-[11px] text-slate-400 mt-1">Active consecutive days</div>
          </div>

          <div class="p-4 rounded-2xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm">
            <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Backlog Ratio</div>
            <div class="mt-1 text-2xl font-extrabold font-mono ${backlogTasks > 0 ? 'text-amber-500' : 'text-emerald-500'}">${backlogTasks}</div>
            <div class="text-[11px] text-slate-400 mt-1">${backlogTasks > 0 ? 'Deferred topics' : 'Clean schedule'}</div>
          </div>
        </div>

        <!-- 30-Day Activity Heatmap -->
        <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="flame" class="w-4 h-4 text-brand-500"></i> 30-Day Completion Heatmap
            </h3>
            <span class="text-xs text-slate-400">Hover for date details</span>
          </div>
          <div class="flex flex-wrap gap-2 pt-2">
            ${heatmapSquaresHtml}
          </div>
          <div class="flex items-center justify-end gap-2 text-[10px] text-slate-400 pt-2">
            <span>Less</span>
            <div class="w-3 h-3 rounded-sm bg-slate-100 dark:bg-slate-800"></div>
            <div class="w-3 h-3 rounded-sm bg-brand-300 dark:bg-brand-900"></div>
            <div class="w-3 h-3 rounded-sm bg-brand-400 dark:bg-brand-700"></div>
            <div class="w-3 h-3 rounded-sm bg-brand-500 dark:bg-brand-600"></div>
            <div class="w-3 h-3 rounded-sm bg-brand-600 dark:bg-brand-400"></div>
            <span>More</span>
          </div>
        </div>

        <!-- Subject Breakdown -->
        <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-4">
          <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="pie-chart" class="w-4 h-4 text-brand-500"></i> Subject Completion Breakdown
          </h3>
          <div class="space-y-4 pt-2">
            ${subjectBreakdownHtml}
          </div>
        </div>
      </div>
    `;
  }

  // --- Screen 7: Settings & Backup ---
  function renderSettings() {
    const currentSprintDay = state.currentSprintDay || 1;
    return `
      <div class="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div>
          <h1 class="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Settings & Backup</h1>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Control your active day, theme, export backups, or restore your study schedule.</p>
        </div>

        <!-- Active Sprint Day Setting -->
        <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-4">
          <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="zap" class="w-4 h-4 text-brand-500"></i> Active Sprint Day Calibration
          </h3>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Current Sprint Day: <span class="font-mono text-brand-500 font-extrabold">Day ${currentSprintDay}</span></div>
              <div class="text-[11px] text-slate-400">Change your active study day anytime (Day 1 to 180).</div>
            </div>
            <div class="flex items-center gap-2">
              <input id="setting-sprint-day" type="number" min="1" max="365" value="${currentSprintDay}" class="w-20 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500" />
              <button onclick="saveActiveSprintDayFromSettings()" class="px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs transition-colors">
                Update Day
              </button>
            </div>
          </div>
        </div>

        <!-- Visual Preferences -->
        <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-4">
          <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <i data-lucide="palette" class="w-4 h-4 text-brand-500"></i> Appearance & Theme
          </h3>
          <div class="flex items-center justify-between pt-2">
            <div>
              <div class="text-xs font-bold text-slate-800 dark:text-slate-200">Dark / Light Mode</div>
              <div class="text-[11px] text-slate-400">Switch between deep dark emerald mesh and crisp light contrast.</div>
            </div>
            <button onclick="th()" class="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-2">
              <i data-lucide="${state.theme === 'light' ? 'moon' : 'sun'}" class="w-4 h-4"></i>
              Toggle Theme
            </button>
          </div>
        </div>

        <!-- Data Backup & Portability -->
        <div class="p-6 rounded-3xl bg-white dark:bg-surface-darkcard border border-slate-200 dark:border-surface-darkborder shadow-sm space-y-5">
          <div>
            <h3 class="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <i data-lucide="hard-drive" class="w-4 h-4 text-brand-500"></i> Data Backup & Portability
            </h3>
            <p class="text-xs text-slate-400 mt-0.5">StudySprint stores everything offline in your browser. Back up your schedule to JSON anytime.</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Export Backup (JSON)</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Download a complete snapshot of courses, tasks, and streaks.</p>
              </div>
              <button onclick="ex()" class="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 transition-all flex items-center justify-center gap-2">
                <i data-lucide="download" class="w-4 h-4"></i> Export Backup
              </button>
            </div>

            <div class="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
              <div>
                <h4 class="text-xs font-bold text-slate-900 dark:text-white">Restore Backup (JSON)</h4>
                <p class="text-[11px] text-slate-400 mt-0.5">Upload a previously exported backup file to restore data.</p>
              </div>
              <label class="w-full py-2.5 rounded-xl border border-brand-500 text-brand-500 hover:bg-brand-500 hover:text-white font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-2">
                <i data-lucide="upload" class="w-4 h-4"></i> Select File to Restore
                <input type="file" accept=".json" onchange="im(this)" class="hidden" />
              </label>
            </div>
          </div>
        </div>

        <!-- Danger Zone: Factory Reset -->
        <div class="p-6 rounded-3xl bg-red-500/5 border border-red-500/20 space-y-4">
          <h3 class="font-bold text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
            <i data-lucide="alert-octagon" class="w-4 h-4"></i> Danger Zone: Factory Reset
          </h3>
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div>
              <div class="text-xs font-bold text-slate-900 dark:text-white">Clear all courses, syllabus tasks, and history</div>
              <div class="text-[11px] text-slate-400">Resets storage key and begins Day 1 fresh.</div>
            </div>
            <button onclick="rst()" class="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-500/20 transition-all shrink-0">
              Reset Everything
            </button>
          </div>
        </div>
      </div>
    `;
  }

  window.saveActiveSprintDayFromSettings = function () {
    const input = document.getElementById('setting-sprint-day');
    if (!input) return;
    const d = Math.max(1, parseInt(input.value, 10) || 1);
    window.setAsToday(d);
  };

  // --- Main Orchestrator / Render Function ---
  function render() {
    applyTheme();

    const hash = window.location.hash || '#/dashboard';
    let route = hash.replace('#/', '').toLowerCase();
    if (!['dashboard', 'daily', 'subjects', 'backlog', 'pomodoro', 'analytics', 'settings'].includes(route)) {
      route = 'dashboard';
    }

    const appEl = document.getElementById('app');
    if (!appEl) return;

    let contentHtml = '';
    switch (route) {
      case 'dashboard':
        contentHtml = renderDashboard();
        break;
      case 'daily':
        contentHtml = renderDailyFocus();
        break;
      case 'subjects':
        contentHtml = renderSubjects();
        break;
      case 'backlog':
        contentHtml = renderBacklog();
        break;
      case 'pomodoro':
        contentHtml = renderPomodoro();
        break;
      case 'analytics':
        contentHtml = renderAnalytics();
        break;
      case 'settings':
        contentHtml = renderSettings();
        break;
      default:
        contentHtml = renderDashboard();
    }

    appEl.innerHTML = `
      ${renderSidebar(route)}
      <main class="flex-1 min-h-screen overflow-y-auto">
        ${contentHtml}
      </main>
    `;

    // Initialize dynamic day-by-day builder if on subjects page
    if (route === 'subjects') {
      const customDaysInput = document.getElementById('sub-custom-days');
      const initialDays = customDaysInput ? parseInt(customDaysInput.value, 10) || 17 : 17;
      window.renderDayInputs(initialDays);
    }

    syncPomodoroUI();
    if (window.lucide) lucide.createIcons();
  }

  // --- Initialization & Route Handling ---
  window.addEventListener('hashchange', render);

  window.addEventListener('DOMContentLoaded', () => {
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }
    render();
  });

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    if (!window.location.hash) {
      window.location.hash = '#/dashboard';
    }
    render();
  }
})();
