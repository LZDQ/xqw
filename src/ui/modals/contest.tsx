import { Contest, ContestStudentState, TICK_INTERVAL } from "../../core/Contest.ts";
import { COMPETITION_NAME, type CompetitionName } from "../../lib/enums.ts";

interface ContestModalOptions {
  onClose?: () => void;
  onFinish?: () => void;
  tickMs?: number;
  cutoffScore?: number;
  cutoffRatio?: number;
}

const CONTEST_CSS = `
.modal{position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:9999;}
.dialog{width:960px;max-width:96%;background:#fff;padding:18px;border-radius:10px;max-height:90vh;box-shadow:0 10px 40px rgba(0,0,0,0.18);display:flex;flex-direction:column;}
.contest-body{flex:1;overflow:auto;min-height:200px;}
.contest-footer{position:sticky;bottom:0;background:#fff;padding-top:8px;display:flex;justify-content:flex-end;margin-top:8px;}
.btn{background:#2b6cb0;color:#fff;border:none;padding:8px 12px;border-radius:6px;cursor:pointer;display:inline-block;text-decoration:none;font-weight:700;}
.btn.btn-ghost{background:transparent;border:1px solid #ddd;color:#333;}
.contest-live-container{max-width:900px;margin:0 auto;}
.contest-header{margin-bottom:20px;padding:12px;background:#f9fafb;border-radius:8px;}
.time-info{font-size:16px;}
.progress-bar-container{width:100%;height:20px;background:#e5e7eb;border-radius:10px;overflow:hidden;}
.progress-bar{height:100%;background:linear-gradient(90deg,#38a169,#48bb78);transition:width 0.3s ease;}
.student-panels{display:flex;flex-direction:column;gap:12px;margin:16px 0;min-height:80px;}
.student-panel{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);position:relative;will-change:transform;backface-visibility:hidden;}
.student-header-line{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
.student-name{font-weight:700;font-size:15px;color:#1a202c;}
.student-score{font-size:14px;color:#4a5568;transition:all 0.3s ease;}
.student-score span{font-weight:700;color:#2b6cb0;}
.student-current-problem{font-size:13px;color:#718096;}
.student-current-problem span{font-weight:600;color:#d97706;}
.problem-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:6px;margin-top:8px;}
.problem-item{background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;padding:8px 4px;text-align:center;transition:all 0.3s ease;}
.problem-item.unattempted{background:#f3f4f6;border-color:#d1d5db;}
.problem-item.partial{background:#fef3c7;border-color:#fbbf24;}
.problem-item.solved{background:#d1fae5;border-color:#34d399;font-weight:700;}
@keyframes problemUpdate{0%{transform:scale(1);}50%{transform:scale(1.15) rotate(2deg);box-shadow:0 4px 12px rgba(52,211,153,0.5);}100%{transform:scale(1) rotate(0deg);}}
.problem-update-animation{animation:problemUpdate 0.6s ease-in-out;}
.problem-id{font-size:12px;font-weight:600;margin-bottom:2px;color:#374151;}
.problem-score{font-size:13px;font-weight:700;color:#1f2937;}
.contest-controls{margin-top:16px;text-align:center;}
.contest-controls .btn{margin:0 6px;min-width:80px;}
.result-table{width:100%;margin:16px 0;border-collapse:collapse;}
.result-table th,.result-table td{padding:10px;border:1px solid #e5e7eb;text-align:left;}
.result-table th{background:#f3f4f6;font-weight:700;color:#374151;}
.result-table td:first-child{font-weight:700;color:#3b82f6;background:#eff6ff;}
.result-table td:nth-child(3){font-weight:700;color:#059669;}
.result-table tbody tr:hover{background:#f9fafb;}
`;

export function createContestModal(contest: Contest, opts: ContestModalOptions = {}): HTMLElement {
  const tickMs = opts.tickMs ?? 1000;
  const modal = document.createElement("div");
  modal.className = "modal";

  const dialog = document.createElement("div");
  dialog.className = "dialog";
  dialog.style.maxWidth = "95%";
  dialog.style.maxHeight = "95vh";

  const style = document.createElement("style");
  style.textContent = CONTEST_CSS;
  dialog.appendChild(style);

  const content = document.createElement("div");
  content.className = "contest-body";
  dialog.appendChild(content);

  const footer = document.createElement("div");
  footer.className = "contest-footer";
  const finishBtn = document.createElement("button");
  finishBtn.className = "btn";
  finishBtn.textContent = "确定";
  finishBtn.style.display = "none";
  footer.appendChild(finishBtn);
  dialog.appendChild(footer);

  modal.appendChild(dialog);

  let currentTimeEl: HTMLSpanElement | null = null;
  let progressBar: HTMLDivElement | null = null;
  let studentPanels: HTMLDivElement | null = null;
  let logPanel: HTMLDivElement | null = null;

  let interval: number | null = null;
  let renderedLogCount = 0;
  let finished = false;
  let showResults = false;
  const contestTitle = COMPETITION_NAME[contest.config.name as CompetitionName] ?? contest.config.name;

  function renderResults(): void {
    content.innerHTML = "";
    const heading = document.createElement("h2");
    heading.textContent = `${contestTitle} 成绩`;
    const table = document.createElement("table");
    table.className = "result-table";
    table.innerHTML = `
      <thead>
        <tr><th>名次</th><th>姓名</th><th>总分</th><th>晋级</th></tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody")!;
    const sorted = [...contest.students].sort((a, b) => b.totalScore - a.totalScore);
    const cutoffScore = opts.cutoffScore ?? 0;
    sorted.forEach((s, idx) => {
      const passed = cutoffScore > 0 ? s.totalScore >= cutoffScore : null;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${idx + 1}</td><td>${s.student.name}</td><td>${Math.round(
        s.totalScore
      )}</td><td>${passed === null ? "-" : passed ? "晋级" : "未晋级"}</td>`;
      tbody.appendChild(tr);
    });
    content.appendChild(heading);
    content.appendChild(table);
    if (cutoffScore > 0) {
      const cutoffNote = document.createElement("div");
      cutoffNote.className = "small muted";
      const cutoffPct = opts.cutoffRatio ? `（${Math.round((opts.cutoffRatio ?? 0) * 100)}%）` : "";
      cutoffNote.textContent = `晋级线：${Math.round(cutoffScore)}${cutoffPct}`;
      content.appendChild(cutoffNote);
    }
  }

  function renderStudents(states: ContestStudentState[]): void {
    if (!studentPanels) return;
    studentPanels.innerHTML = "";
    const sorted = [...states].sort((a, b) => b.totalScore - a.totalScore);
    for (const state of sorted) {
      const card = document.createElement("div");
      card.className = "student-panel";
      card.innerHTML = `
        <div class="student-header-line">
          <div class="student-name">${state.student.name}</div>
          <div class="student-score">总分: <span>${Math.round(state.totalScore)}</span></div>
          <div class="student-current-problem">
            当前题目: <span>${state.currentTarget !== null ? `T${(state.currentTarget ?? 0) + 1}` : "未选择"}</span>
          </div>
        </div>
      `;
      const grid = document.createElement("div");
      grid.className = "problem-grid";
      for (const prob of state.problems) {
        const item = document.createElement("div");
        const statusClass = prob.solved
          ? "solved"
          : prob.maxScoreEarned > 0
            ? "partial"
            : "unattempted";
        item.className = `problem-item ${statusClass}`;
        const idLabel = document.createElement("div");
        idLabel.className = "problem-id";
        idLabel.textContent = `T${prob.id + 1}`;
        const scoreLabel = document.createElement("div");
        scoreLabel.className = "problem-score";
        scoreLabel.textContent = `${prob.maxScoreEarned}/${prob.maxScore}`;
        item.appendChild(idLabel);
        item.appendChild(scoreLabel);
        grid.appendChild(item);
      }
      card.appendChild(grid);
      studentPanels.appendChild(card);
    }
  }

  function renderLogs(): void {
    if (!logPanel) return;
    if (!contest.logs.length || renderedLogCount === contest.logs.length) return;
    const slice = contest.logs.slice(renderedLogCount);
    for (const log of slice) {
      const row = document.createElement("div");
      row.textContent = `[${Math.round(log.time)}m] ${log.message}`;
      row.style.marginBottom = "6px";
      const color =
        log.type === "solve" ? "#047857" : log.type === "skip" ? "#b45309" : "#1f2937";
      row.style.color = color;
      logPanel.appendChild(row);
    }
    renderedLogCount = contest.logs.length;
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  function renderHeader(): void {
    if (!currentTimeEl || !progressBar) return;
    currentTimeEl.textContent = String(contest.currentTick * TICK_INTERVAL);
    const pct = Math.min(100, (contest.currentTick / contest.maxTicks) * 100);
    progressBar.style.width = `${pct}%`;
  }

  function renderAll(): void {
    if (showResults) {
      return;
    }
    renderHeader();
    renderStudents(contest.students);
    renderLogs();
    if (finished) {
      finishBtn.style.display = "inline-block";
    }
  }

  function buildLiveView(): void {
    content.innerHTML = `
      <div class="contest-live-container" style="display:flex;gap:15px;">
        <div style="flex:2;">
          <h2>${contestTitle} - 实时模拟</h2>
          <div class="contest-header">
            <div class="time-info">
              <span id="contest-current-time">0</span> / ${contest.config.duration} 分钟
            </div>
            <div class="progress-bar-container">
              <div id="contest-progress-bar" class="progress-bar" style="width:0%"></div>
            </div>
          </div>
          <div class="student-panels" id="student-panels"></div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;">
          <h3 style="margin:0 0 10px 0;">比赛日志</h3>
          <div id="contest-log-panel" style="
            flex:1;
            background:#f9f9f9;
            border:1px solid #ddd;
            border-radius:4px;
            padding:10px;
            overflow-y:auto;
            max-height:600px;
            font-size:12px;
            font-family:monospace;
          "></div>
        </div>
      </div>
    `;
    currentTimeEl = content.querySelector<HTMLSpanElement>("#contest-current-time");
    progressBar = content.querySelector<HTMLDivElement>("#contest-progress-bar");
    studentPanels = content.querySelector<HTMLDivElement>("#student-panels");
    logPanel = content.querySelector<HTMLDivElement>("#contest-log-panel");
  }

  function runTick(): void {
    const keepGoing = contest.tick();
    renderAll();
    if (!keepGoing) {
      stopTimer();
      finished = true;
      renderAll();
      finishBtn.style.display = "inline-block";
    }
  }

  function startTimer(): void {
    if (interval !== null) return;
    interval = window.setInterval(() => {
      runTick();
    }, tickMs);
  }

  function stopTimer(): void {
    if (interval !== null) {
      window.clearInterval(interval);
      interval = null;
    }
  }
  finishBtn.onclick = () => {
    if (showResults) {
      modal.remove();
      if (opts.onFinish) opts.onFinish();
      if (opts.onClose) opts.onClose();
      return;
    }
    if (!finished) return;
    stopTimer();
    contest.finalizeResults();
    showResults = true;
    renderResults();
    finishBtn.style.display = "inline-block";
    finishBtn.textContent = "确定";
  };

  // initial render and start ticking
  buildLiveView();
  renderAll();
  startTimer();

  return modal;
}
