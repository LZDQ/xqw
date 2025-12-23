const CSS = `
.acg-board {
  --bg: #f7f7f8;
  --card: #ffffff;
  --muted: #666;
  --accent: #2b6cb0;
  --border: #e5e7eb;
  margin: 0;
  padding: 0;
  background: var(--bg);
  color: #222;
  font-family: "PingFang SC", "Microsoft YaHei", Arial, Helvetica, sans-serif;
}
.acg-board * { box-sizing: border-box; }
.acg-board .container {
  max-width: 1100px;
  margin: 12px auto;
  padding: 12px;
}
.acg-board header {
  background: var(--card);
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.acg-board header h1 { margin: 0; font-size: 18px; }
.acg-board .topline {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.acg-board .topline .small { white-space: nowrap; font-size: 13px; color: var(--muted); }
.acg-board .panel {
  background: var(--card);
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .04);
}
.acg-board .row { display: flex; gap: 12px; flex-wrap: wrap; }
.acg-board .col { flex: 1; min-width: 240px; }
.acg-board .small { font-size: 13px; color: var(--muted); }
.acg-board .muted { color: var(--muted); }
.acg-board .action-cards { display: flex; flex-direction: column; gap: 10px; }
.acg-board .action-card {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  cursor: default;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.acg-board .action-card .card-title { font-weight: 700; margin-bottom: 6px; }
.acg-board .action-card .card-desc { font-size: 13px; color: var(--muted); line-height: 1.5; }
.acg-board .student {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 8px;
  background: #fff;
}
.acg-board .stat { font-weight: 700; }
.acg-board .section-title { margin: 0 0 8px 0; font-size: 15px; }
.acg-board .next-panel {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
.acg-board .log {
  height: 80px;
  overflow: auto;
  border: 1px solid var(--border);
  padding: 8px;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
}
.acg-board .grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.acg-board .grid-card {
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: #fff;
}
.acg-board .hidden { display: none !important; }
.acg-board .sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.acg-board .pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #eef2ff;
  border: 1px solid #cbd5ff;
  border-radius: 999px;
  font-size: 12px;
  color: #334155;
}
.acg-board .ghost-btn {
  border: 1px solid var(--border);
  background: #fff;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 13px;
  color: #222;
}
.acg-board .ghost-btn:hover { background: #f2f4f7; }
.acg-board .action-modal {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 18px rgba(0,0,0,0.05);
}
.acg-board .action-modal h4 { margin: 0 0 6px 0; }
.acg-board .action-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }
.acg-board .modal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 10px; margin-top: 8px; }
.acg-board .muted-box {
  padding: 10px;
  border: 1px dashed var(--border);
  border-radius: 10px;
  background: #fafafa;
}
`;

export function createBoardDom(): HTMLElement {
  const style = <style dangerouslySetInnerHTML={{ __html: CSS }} />;

  const board = (
    <div className="acg-board">
      {style}
      <div className="container">
        <header>
          <div><h1>OI 教练模拟器</h1></div>
          <div className="topline">
            <div className="small">第 <span id="header-week">1</span> 周</div>
            <div className="small">省份: <span id="header-province">-</span></div>
            <div className="small">经费: <span id="header-budget">¥0</span></div>
            <div className="small">声誉: <span id="header-reputation">0</span></div>
            <div className="small">天气: <span id="header-weather-text">晴</span> / 温度: <span id="header-temp-header">20°C</span></div>
            <div className="small muted">下场比赛: <span id="header-next-comp-small">暂无</span></div>
          </div>
        </header>

        <div className="row">
          <div className="col panel" style={{ flex: "1 1 600px" }}>
            <div id="weekly-view" className="sidebar-view">
              <div className="sidebar-head">
                <h3 className="section-title" style={{ margin: 0 }}>本周信息</h3>
                <div className="pill">周视图 · 计划概览</div>
              </div>
              <div className="grid" style={{ marginTop: "10px" }}>
                <div className="grid-card">
                  <div className="small muted">周数</div>
                  <div className="stat">第 <span id="week-current">1</span> / <span id="week-total">26</span> 周</div>
                </div>
                <div className="grid-card">
                  <div className="small muted">天气 / 温度</div>
                  <div className="stat"><span id="week-weather">晴</span> / <span id="week-temp">20°C</span></div>
                </div>
                <div className="grid-card">
                  <div className="small muted">预测 4 周开支</div>
                  <div className="stat">¥<span id="forecast-expense">120,000</span></div>
                </div>
                <div className="grid-card">
                  <div className="small muted">设施状态</div>
                  <div className="stat small" id="facility-status">
                    电脑 Lv.1 · 资料库 Lv.1<br />
                    空调 Lv.1 · 宿舍 Lv.1<br />
                    食堂 Lv.1 · 维护费 ¥0
                  </div>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <h3 className="section-title">下场比赛</h3>
                <div id="next-competition-panel" className="next-panel">
                  <div id="next-comp">暂无安排</div>
                  <div id="daily-quote" className="small muted">保持训练，随时待命。</div>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <h3 className="section-title">日志</h3>
                <div id="log" className="log">
                  <div>· 第 1 周开始，检查天气与日程。</div>
                  <div>· 学生 A 完成专项训练，实力提升。</div>
                  <div>· 学生 C 放松一周，压力下降。</div>
                </div>
              </div>
            </div>

            <div id="action-view" className="sidebar-view hidden">
              <div className="sidebar-head">
                <div>
                  <div className="small muted">当前行动</div>
                  <h3 id="action-view-title" style={{ margin: "2px 0 0 0" }}>娱乐安排</h3>
                </div>
                <button id="action-back" className="ghost-btn">返回本周信息</button>
              </div>
              <div className="action-meta">
                <span className="pill" id="action-duration">持续 1 周</span>
                <span className="pill" id="action-cost">预计费用 ¥0</span>
                <span className="pill" id="action-impact">影响：舒适度、压力</span>
              </div>

              <div id="action-view-body" style={{ marginTop: "12px" }}>
                <div className="action-modal">
                  <h4>娱乐活动（1周）</h4>
                  <div className="small muted">放松娱乐，缓解压力，让学生短暂抽离训练。</div>
                  <div className="modal-grid" style={{ marginTop: "8px" }}>
                    <div className="grid-card">
                      <div className="small muted">可能选项</div>
                      <div>郊游 · 电影 · 桌游 · 打 CS</div>
                    </div>
                    <div className="grid-card">
                      <div className="small muted">主要效果</div>
                      <div>压力下降，舒适度提升，少量消耗经费</div>
                    </div>
                    <div className="grid-card">
                      <div className="small muted">风险</div>
                      <div>停训一周，个别事件可能带来额外影响</div>
                    </div>
                  </div>
                  <div className="muted-box" style={{ marginTop: "10px" }}>
                    <div className="small muted">提示</div>
                    <div style={{ lineHeight: 1.5 }}>
                      娱乐会暂停当前训练；根据天赋和压力水平，最终效果会有波动。选择后将在周末结算。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col panel" style={{ flex: "0 0 360px" }}>
            <h3 style={{ marginTop: "0" }}>本周行动（每个行动持续1周）</h3>
            <div className="action-cards">
              <div className="action-card" id="action-train" role="button" tabIndex={0}>
                <div className="card-title">训练</div>
                <div className="card-desc">安排学生进行专项训练，提高实力</div>
              </div>
              <div className="action-card" id="action-entertain" role="button" tabIndex={0}>
                <div className="card-title">娱乐</div>
                <div className="card-desc">放松娱乐，缓解压力</div>
              </div>
              <div className="action-card" id="action-mock" role="button" tabIndex={0}>
                <div className="card-title">模拟赛</div>
                <div className="card-desc">进行内部模拟比赛，检验训练成果</div>
              </div>
              <div className="action-card" id="action-outing" role="button" tabIndex={0}>
                <div className="card-title">集训</div>
                <div className="card-desc">参加合适的外出集训，集中提升训练效率</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) as HTMLElement;

  const weeklyView = board.querySelector<HTMLElement>("#weekly-view");
  const actionView = board.querySelector<HTMLElement>("#action-view");
  const actionTitle = board.querySelector<HTMLElement>("#action-view-title");
  const actionBody = board.querySelector<HTMLElement>("#action-view-body");
  const actionCost = board.querySelector<HTMLElement>("#action-cost");
  const actionImpact = board.querySelector<HTMLElement>("#action-impact");
  const actionDuration = board.querySelector<HTMLElement>("#action-duration");
  const backBtn = board.querySelector<HTMLButtonElement>("#action-back");

  function showWeekly(): void {
    weeklyView?.classList.remove("hidden");
    actionView?.classList.add("hidden");
  }

  function renderUnimplemented(label: string): void {
    if (!actionBody || !actionTitle) return;
    actionTitle.textContent = `${label}（未完成迁移）`;
    actionBody.innerHTML = `
      <div class="muted-box">
        <div class="small muted">即将开放</div>
        <div style="line-height: 1.5">该行动的详细配置仍在迁移中。可先从右侧选择已完成的“娱乐”体验。</div>
      </div>
    `;
    if (actionCost) actionCost.textContent = "预计费用 ¥-";
    if (actionImpact) actionImpact.textContent = "影响：等待补充";
    if (actionDuration) actionDuration.textContent = "持续 1 周";
  }

  function renderRelax(): void {
    if (!actionBody || !actionTitle) return;
    actionTitle.textContent = "娱乐安排";
    actionBody.innerHTML = `
      <div class="action-modal">
        <h4>娱乐活动（1周）</h4>
        <div class="small muted">放松娱乐，缓解压力，让学生短暂抽离训练。</div>
        <div class="modal-grid" style="margin-top: 8px">
          <div class="grid-card">
            <div class="small muted">可能选项</div>
            <div>郊游 · 电影 · 桌游 · 打 CS</div>
          </div>
          <div class="grid-card">
            <div class="small muted">主要效果</div>
            <div>压力下降，舒适度提升，少量消耗经费</div>
          </div>
          <div class="grid-card">
            <div class="small muted">风险</div>
            <div>停训一周，个别事件可能带来额外影响</div>
          </div>
        </div>
        <div class="muted-box" style="margin-top: 10px">
          <div class="small muted">提示</div>
          <div style="line-height: 1.5">
            娱乐会暂停当前训练；根据天赋和压力水平，最终效果会有波动。选择后将在周末结算。
          </div>
        </div>
      </div>
    `;
    if (actionCost) actionCost.textContent = "预计费用 ¥0";
    if (actionImpact) actionImpact.textContent = "影响：舒适度、压力";
    if (actionDuration) actionDuration.textContent = "持续 1 周";
  }

  function showAction(cardId: string): void {
    weeklyView?.classList.add("hidden");
    actionView?.classList.remove("hidden");
    switch (cardId) {
      case "action-entertain":
        renderRelax();
        break;
      case "action-train":
        renderUnimplemented("训练");
        break;
      case "action-mock":
        renderUnimplemented("模拟赛");
        break;
      case "action-outing":
        renderUnimplemented("集训");
        break;
      default:
        showWeekly();
    }
  }

  board.querySelectorAll<HTMLElement>(".action-card").forEach((card) => {
    card.addEventListener("click", () => showAction(card.id));
  });
  backBtn?.addEventListener("click", showWeekly);

  // expose programmatic controls for the 3D layer
  (board as any).__showActionCard = showAction;
  (board as any).__showWeeklyView = showWeekly;

  return board;
}
