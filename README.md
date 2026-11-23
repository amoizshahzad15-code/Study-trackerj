# 🚀 StudySprint — Personal Study OS & Syllabus Tracker (V5)

> **Single-User Study Operating System**  
> Dynamic 20-Day, 30-Day, and Custom-Duration (e.g. 17 Days) Study Sprint Manager, Day-by-Day Syllabus Builder, Active Day Calibration, Auto-Rescheduling Backlog, and Integrated Pomodoro Deep Work System.

---

## 📖 Project Overview

**StudySprint** is a high-performance, distraction-free Single-Page Application (SPA) designed to solve the biggest challenge students face: **rigid timetables that collapse when life happens**.

When a traditional static schedule or calendar is interrupted, StudySprint automatically adapts:
- **Intelligent Rescheduling:** Move missed topics to tomorrow, deposit into the Backlog Room, or auto-balance into the least busy upcoming days.
- **Custom Sprint Durations:** Choose 20-day, 30-day, or any custom duration (e.g. 17, 21, 45, 60 days).
- **Day-by-Day Syllabus Builder:** When custom days (e.g. 17) is selected, dedicated input options appear for every single day (`Day 1 Syllabus`, `Day 2 Syllabus`, ... `Day 17 Syllabus`).
- **Flexible Active Day Calibration:** Start on Day 1 anytime. Change your active study day directly via the dropdown, header button, or sidebar indicator without calendar lock-in.
- **Integrated Pomodoro Focus & Floating Mini-Dock:** Continuous countdowns and Web Audio chimes across every view.
- **100% Offline-First & Private:** Stored directly in browser `localStorage` under `STUDYSPRINT_PERSONAL_V5`. No servers, no authentication barriers.

---

## ✨ Features & Function Reference

### 1. 🎯 Dashboard (`#/dashboard`)
- **Key Metrics:** Overall completion percentage, active sprint day (Day 1 = start/reset date), consistency streak 🔥, and backlog counter.
- **Sprint Day Changer:** Direct click to adjust active sprint day anytime.
- **Backlog Alert Banner:** Direct 1-click prompt to auto-reschedule any pending backlog topics.
- **Today's Priorities:** Complete or reschedule topics scheduled for the current sprint day.
- **Active Course Cards:** Live completion progress bars and quick links to study.

### 2. 📅 Today's Focus (`#/daily`)
- **Active Day Calibration (`setAsToday(day)`):** Selecting any day (e.g. Day 1) in the dropdown makes it your active study day immediately! No more getting locked to Day 2 when you want Day 1.
- **Day Navigator (`gd(day)`):** Prev (`←`), Next (`→`), and Day Selector dropdown (covers 30+ days and marks `(Today 🔥)`).
- **`done(id)`:** Toggles topic between Done and Todo. Triggers two-tone Web Audio chime, celebratory confetti, and logs daily streak and heatmap activity.
- **`nd(id)`:** Opens the Smart Reschedule Dialog with 3 options:
  - `rs(id, 't')`: Move to tomorrow (`currentSprintDay + 1`).
  - `rs(id, 'b')`: Send to Backlog Room.
  - `rs(id, 'x')`: Balance over next 3 days into the day with the fewest tasks.
- **`note(id)`:** Attach or edit personal study notes and formulas per task.

### 3. 📚 Subjects & Sprints (`#/subjects`)
- **`addSub()`:** Create a new course sprint with:
  - Subject Name.
  - Sprint Timeline (20-Day Fast Sprint, 30-Day Standard, or Custom Duration e.g. 17 Days).
  - Target Exam Date.
  - Setup Modes:
    - **🎯 Day-by-Day Syllabus Options:** Dynamically generates `Day 1 Syllabus`, `Day 2 Syllabus`, ... `Day N Syllabus` fields.
    - **⚡ Auto-Distribute:** Bulk paste all topics in one box, evenly divided across days.
- **`addT(subjectId)`:** Add an individual task for any day to a subject at any time.
- **`delS(subjectId)`:** Delete a subject and all associated scheduled topics.

### 4. 📥 Backlog Room (`#/backlog`)
- Safe repository for all deferred or postponed topics.
- **`resAll()`:** 1-Click Auto-Reschedule All — evenly distributes all backlog topics across the least busy of the next 5 days (`today + 1` to `today + 5`).
- **`mv(id)`:** Move an individual backlog task directly to today's focus.

### 5. ⏱️ Pomodoro Focus Timer (`#/pomodoro`)
- **`pm(mode)`:** Switch modes (25m Focus, 5m Short Break, 15m Long Break).
- **`pt()`:** Start / Pause timer using end-time calculation (`Date.now() + remaining`).
- **`pr()`:** Reset timer to default interval.
- **Floating Mini-Dock:** Automatically docks to bottom-right when navigating other views while running.

### 6. 📊 Analytics (`#/analytics`)
- **Velocity Meter:** Average tasks mastered per sprint day.
- **30-Day Activity Heatmap:** GitHub-style emerald green contribution squares with tooltips.
- **Subject Mastery Breakdown:** Visual progress bars for every registered course.

### 7. ⚙️ Settings & Backup (`#/settings`)
- **Active Sprint Day Setting:** Direct number input to set active day (1 to 180).
- **Appearance:** Instant Dark/Light theme toggle (`th()`).
- **Data Export & Import:** Full JSON backup and restore capabilities (`ex()`, `im()`).
- **Factory Reset:** Clean slate reset button (`rst()`).

---

## 💾 Storage Architecture (`STUDYSPRINT_PERSONAL_V5`)

Data is persisted in browser LocalStorage:
```json
{
  "day1Date": "2026-11-23",
  "currentSprintDay": 1,
  "subjects": [
    {
      "id": "sub_math",
      "name": "Mathematics II",
      "sprintDays": 17,
      "examDate": "2026-12-15",
      "color": "emerald"
    }
  ],
  "tasks": [
    {
      "id": "tsk_1",
      "subjectId": "sub_math",
      "title": "Chapter 1: Limits & Continuity Foundations",
      "day": 1,
      "status": "todo",
      "note": "Review trigonometric limit theorems"
    }
  ],
  "history": {
    "2026-11-23": 1
  },
  "theme": "dark"
}
```

---

## 🌐 Netlify Deployment (10-Second Drag & Drop)

1. Open **[https://app.netlify.com/drop](https://app.netlify.com/drop)** in your browser.
2. Drag and drop **`studysprint-netlify-ready.zip`** (or the **`studysprint`** folder) directly into the upload area.
3. Your web app goes live immediately on an SSL-secured `.netlify.app` domain.
