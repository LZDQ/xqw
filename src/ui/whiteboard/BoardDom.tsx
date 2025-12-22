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
            <div className="row" style={{ alignItems: "flex-start" }}>
              <div className="col">
                <h3 className="section-title">学生与状态</h3>
                <div className="small muted">舒适度: <span id="comfort-val" className="stat">50</span></div>
                <div id="student-list" style={{ marginTop: "10px" }}>
                  <div className="student">
                    <div><strong>学生 A</strong> · 省选备战</div>
                    <div className="small muted">压力 20 · 实力 65 · 健康 良好</div>
                  </div>
                  <div className="student">
                    <div><strong>学生 B</strong> · 基础训练</div>
                    <div className="small muted">压力 30 · 实力 58 · 健康 良好</div>
                  </div>
                  <div className="student">
                    <div><strong>学生 C</strong> · 放松周</div>
                    <div className="small muted">压力 12 · 实力 50 · 健康 良好</div>
                  </div>
                </div>
              </div>

              <div className="col">
                <h3 className="section-title">本周信息</h3>
                <div className="grid">
                  <div className="grid-card">
                    <div className="small muted">周数</div>
                    <div className="stat">第 1 / 26 周</div>
                  </div>
                  <div className="grid-card">
                    <div className="small muted">天气 / 温度</div>
                    <div className="stat">晴 / 20°C</div>
                  </div>
                  <div className="grid-card">
                    <div className="small muted">预测 4 周开支</div>
                    <div className="stat">¥120,000</div>
                  </div>
                  <div className="grid-card">
                    <div className="small muted">设施状态</div>
                    <div className="stat small">
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

  return board;
}
