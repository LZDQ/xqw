import type { GameState } from "../core/GameState.ts";
import { TALENTS } from "../core/Talents.ts";
import { DIFFICULTIES, PROVINCES } from "../lib/config.ts";
import { COMPETITION_SCHEDULE, SEASON_WEEKS } from "../lib/constants.ts";
import { KNOWLEDGE, type KnowledgeType } from "../lib/enums.ts";

function normalizeEndingReason(reason?: string | null): string {
  const raw = (reason ?? "").trim();
  if (!raw) return "赛季结束";
  const lower = raw.toLowerCase();
  if (lower.includes("akioi")) return "AKIOI";
  if (lower.includes("budget") || lower.includes("经费")) return "经费不足";
  if (lower.includes("无学生") || lower.includes("淘汰")) return "无学生";
  if (lower.includes("晋级")) return "晋级链断裂";
  return raw;
}

function computeFinalEnding(gameState: GameState, endingReason: string): string {
  const normalized = normalizeEndingReason(endingReason);
  if (normalized === "AKIOI") return "👑 AKIOI";
  if (gameState.budget <= 0 || normalized.includes("经费")) return "💸 经费耗尽结局";
  const active = gameState.students.filter((s) => s.active !== false).length;
  if (active === 0 || normalized.includes("无学生")) return "😵 崩溃结局";
  return "💼 普通结局";
}

function mapEndingDescription(title: string): string {
  const map: Record<string, string> = {
    "💸 经费耗尽结局": "项目经费枯竭，无法继续运作，曾经的努力戛然而止。",
    "🌟 荣耀结局": "队伍取得突破性的成绩，信息学团队声誉大增。",
    "🌟 顶尖结局": "走上世界舞台，成为信息学竞赛的顶尖队伍。",
    "👑 AKIOI": "不可思议的满分！你的名字将被铭刻在竞赛史上。",
    "😵 崩溃结局": "团队陷入混乱或无人可用，赛季被迫终止。",
    "💼 普通结局": "项目平稳结束，积累了经验，等待下一次再出发。",
    "❓ 未知结局": "结局信息不足，无法判定具体结果。"
  };
  return map[title] ?? map["💼 普通结局"];
}

function formatDifficulty(id: number): string {
  const diff = DIFFICULTIES.find((d) => d.id === id);
  return diff ? `${diff.name} — ${diff.description}` : "普通";
}

function formatProvince(provinceId: number): string {
  const prov = PROVINCES.find((p) => p.id === provinceId);
  return prov ? `${prov.name} · ${prov.type === "STRONG" ? "强省" : prov.type === "WEAK" ? "弱省" : "普通"}` : "未知";
}

function renderKnowledgeBadges(knowledge: Record<KnowledgeType, number>): string {
  return (Object.entries(knowledge) as Array<[KnowledgeType, number]>)
    .map(
      ([key, value]) =>
        `<span class="kb" title="${KNOWLEDGE[key]}">${KNOWLEDGE[key]} ${Math.round(value)}</span>`
    )
    .join("");
}

function renderTalentPills(talents: Iterable<string>): string {
  const list = Array.from(talents).filter((name) => name !== "__talent_cleanup__");
  if (!list.length) return `<span class="muted small">暂无天赋</span>`;
  return list
    .map((name) => {
      const def = TALENTS.find((t) => t.name === name);
      const color = def?.color ?? "#e5e7eb";
      return `<span class="talent-pill" style="border-color:${color};background:${color}1a;">${name}</span>`;
    })
    .join("");
}

function renderStudents(gameState: GameState): string {
  if (!gameState.students.length) return `<div class="muted small">暂无学生记录</div>`;
  return gameState.students
    .map((student) => {
      const pressure = Math.round(student.pressure ?? 0);
      const activeTag = student.active !== false ? `<span class="tag">在队</span>` : `<span class="tag" style="background:#fee2e2;border-color:#fecdd3;">已退队</span>`;
      return `<div class="student-row">
        <div class="row-head">
          <div class="name">${student.name}</div>
          <div class="tag">压力 ${pressure}</div>
        </div>
        <div class="knowledge-badges" style="margin-top:6px;">${renderKnowledgeBadges(student.knowledge)}</div>
        <div class="talents">${renderTalentPills(student.talents)}</div>
        <div class="row-head" style="margin-top:6px;">
          ${activeTag}
          <div class="small muted">思维 ${Math.round(student.thinking)} · 代码 ${Math.round(student.coding)}</div>
        </div>
      </div>`;
    })
    .join("");
}

function renderTimeline(week: number): string {
  const progress = Math.min(100, Math.max(0, (week / SEASON_WEEKS) * 100));
  const pins = COMPETITION_SCHEDULE.map((comp) => {
    const left = Math.min(100, (comp.week / SEASON_WEEKS) * 100);
    return `<div class="timeline-pin" style="left:${left}%">
      <div class="dot"></div>
      <div>${comp.name}</div>
    </div>`;
  }).join("");
  return `<div class="timeline">
    <div class="timeline-bar">
      <div class="timeline-progress" style="width:${progress}%"></div>
    </div>
    <div class="timeline-pins">${pins}</div>
  </div>`;
}

export function showEndOverlay(parent: HTMLElement, gameState: GameState): void {
  let overlay = parent.querySelector<HTMLElement>("#end-screen");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "end-screen";
    parent.appendChild(overlay);
  }

  const endingReason = normalizeEndingReason(gameState.gameEndReason);
  const finalEnding = computeFinalEnding(gameState, endingReason);
  const endingDesc = mapEndingDescription(finalEnding);

  const activeStudents = gameState.students.filter((s) => s.active !== false);
  const averagePressure =
    activeStudents.length === 0
      ? 0
      : Math.round(
          activeStudents.reduce((acc, cur) => acc + (cur.pressure ?? 0), 0) / activeStudents.length
        );

  const totalExpenses = gameState.totalExpenses ?? 0;

  overlay.innerHTML = `
    <div class="end-card">
      <h2>赛季结算</h2>
      <p class="end-subtitle">结束原因：<span class="ending-highlight">${endingReason}</span></p>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="small muted">难度</div>
          <div style="font-weight:800;">${formatDifficulty(gameState.difficulty)}</div>
          <div class="small muted" style="margin-top:6px;">省份 · ${formatProvince(gameState.provinceId)}</div>
        </div>
        <div class="stat-card">
          <div class="small muted">学生</div>
          <div style="font-weight:800;">初始 ${gameState.initialStudents} · 在队 ${activeStudents.length}</div>
          <div class="small muted" style="margin-top:6px;">平均压力 ${averagePressure}</div>
        </div>
        <div class="stat-card">
          <div class="small muted">经费</div>
          <div style="font-weight:800;">当前 ¥${gameState.budget.toLocaleString()}</div>
          <div class="small muted" style="margin-top:6px;">累计支出 ¥${totalExpenses.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="small muted">进度</div>
          <div style="font-weight:800;">第 ${gameState.week} / ${SEASON_WEEKS} 周</div>
          <div class="small muted" style="margin-top:6px;">声誉 ${Math.round(gameState.reputation)}</div>
        </div>
      </div>

      ${renderTimeline(gameState.week)}

      <div class="stat-card" style="margin-top:12px;">
        <div class="small muted">学生总结</div>
        <div class="student-list">${renderStudents(gameState)}</div>
      </div>

      <div class="stat-card" style="margin-top:12px; text-align:center;">
        <div style="font-size:18px;font-weight:800;margin-bottom:6px;">最终结局</div>
        <div class="ending-highlight ending-animate" id="ending-text">${finalEnding}</div>
        <div class="small muted" id="ending-desc" style="margin-top:8px;">${endingDesc}</div>
      </div>

      <div class="end-actions">
        <button class="btn btn-ghost" id="restart-btn" type="button">回到开始</button>
      </div>
    </div>
  `;

  const restartBtn = overlay.querySelector<HTMLButtonElement>("#restart-btn");
  restartBtn?.addEventListener("click", () => {
    window.location.reload();
  });
}
