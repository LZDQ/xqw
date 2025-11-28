const KEY = "acg3d-save";

export function saveState(state){
  try{
    const data = {
      week: state.week,
      players: state.players,
      notes: state.notes || []
    };
    localStorage.setItem(KEY, JSON.stringify(data));
  }catch(err){
    console.warn("save failed", err);
  }
}

export function loadState(){
  try{
    const raw = localStorage.getItem(KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  }catch(err){
    console.warn("load failed", err);
    return null;
  }
}

export function clearState(){
  try{ localStorage.removeItem(KEY); }catch(err){ console.warn(err); }
}
