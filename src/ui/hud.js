export function createHUD(state, opts = {}){
  const container = document.createElement("div");
  container.id = "hud";
  container.innerHTML = `
    <h1>教室指挥台</h1>
    <div class="status">
      <div id="week">第 1 周</div>
      <div id="tip">WASD 移动，点击锁定视角，瞄准墙上按钮执行操作。</div>
      <div id="selected">目标：未选</div>
    </div>
    <div class="buttons">
      <button id="lock">进入教室</button>
      <button id="save">保存</button>
      <button id="reset">重置周数</button>
    </div>
  `;

  const weekLabel = container.querySelector("#week");
  const selectedLabel = container.querySelector("#selected");
  const lockBtn = container.querySelector("#lock");
  const saveBtn = container.querySelector("#save");
  const resetBtn = container.querySelector("#reset");

  lockBtn.addEventListener("click", () => opts.onLock && opts.onLock());
  saveBtn.addEventListener("click", () => opts.onSave && opts.onSave());
  resetBtn.addEventListener("click", () => {
    if(state.reset) state.reset();
    if(opts.onReset) opts.onReset();
  });

  function render(){
    weekLabel.textContent = `第 ${state.week} 周`;
  }

  function setSelected(name){
    selectedLabel.textContent = `目标：${name || "未选"}`;
  }

  state.on("weekChanged", render);
  render();

  return { element: container, render, setSelected };
}
