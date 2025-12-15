import { EventBus } from "./events.js";

const defaultPlayers = [
  { id: "p1", name: "选手A", status: "idle", stress: 20, energy: 80 },
  { id: "p2", name: "选手B", status: "idle", stress: 25, energy: 75 },
  { id: "p3", name: "选手C", status: "idle", stress: 30, energy: 70 },
  { id: "p4", name: "选手D", status: "idle", stress: 22, energy: 78 }
];

export class GameState {
  constructor(initialData = {}){
    this.week = initialData.week || 1;
    this.players = Array.isArray(initialData.players) && initialData.players.length
      ? initialData.players
      : defaultPlayers.map(p => ({ ...p }));
    this.notes = initialData.notes || [];
    this.bus = new EventBus();
  }

  on(event, handler){ return this.bus.on(event, handler); }

  advanceWeek(){
    this.week += 1;
    this.bus.emit("weekChanged", { week: this.week });
  }

  setPlayerStatus(id, status, note){
    const player = this.players.find(p => p.id === id);
    if(!player) return;
    player.status = status;
    if(typeof note === "string") player.note = note;
    this.bus.emit("playerChanged", { player });
  }

  applyAction(action, targetId){
    const actionMap = {
      train: { status: "training", note: "训练中，技能提升" },
      simulate: { status: "contest", note: "模拟赛中，成绩待定" },
      eat: { status: "eating", note: "去吃饭，恢复体力" },
      camp: { status: "camp", note: "外出集训，提升综合实力" }
    };
    const mapped = actionMap[action] || { status: "busy", note: "任务进行中" };
    if(targetId){
      this.setPlayerStatus(targetId, mapped.status, mapped.note);
    }else{
      this.players.forEach(p => this.setPlayerStatus(p.id, mapped.status, mapped.note));
    }
    this.notes.unshift(`[周${this.week}] ${targetId || "全队"} -> ${mapped.status}`);
    this.advanceWeek();
    this.bus.emit("action", { action, targetId, week: this.week });
  }

  reset(){
    this.week = 1;
    this.players = this.players.map(p => ({ ...p, status: "idle", note: "" }));
    this.notes = [];
    this.bus.emit("weekChanged", { week: this.week });
    this.bus.emit("playerChanged", { reset: true });
  }
}
