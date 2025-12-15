const statusText = {
  idle: "空闲",
  training: "训练",
  contest: "模拟赛",
  eating: "吃饭",
  camp: "外出集训",
  busy: "忙碌"
};

export function createWhiteboard(state){
  const el = document.createElement("div");
  el.id = "whiteboard";
  el.innerHTML = `
    <h2>白板</h2>
    <div id="players"></div>
    <div id="log"></div>
  `;

  const playersEl = el.querySelector("#players");
  const logEl = el.querySelector("#log");

  function renderPlayers(){
    playersEl.innerHTML = "";
    state.players.forEach(p => {
      const div = document.createElement("div");
      div.className = "player";
      const tag = statusText[p.status] || p.status;
      div.textContent = `${p.name} - ${tag}${p.note ? `：${p.note}` : ""}`;
      playersEl.appendChild(div);
    });
  }

  function renderLog(){
    logEl.innerHTML = "";
    const items = (state.notes || []).slice(0, 6);
    items.forEach(note => {
      const div = document.createElement("div");
      div.style.fontSize = "12px";
      div.style.opacity = "0.9";
      div.textContent = note;
      logEl.appendChild(div);
    });
  }

  state.on("playerChanged", () => { renderPlayers(); renderLog(); });
  state.on("weekChanged", () => { renderLog(); });
  renderPlayers();
  renderLog();

  return { element: el, render: () => { renderPlayers(); renderLog(); } };
}
