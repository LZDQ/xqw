import {
  DataTexture,
  RGBAFormat,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  UnsignedByteType
} from "three";
import { KNOWLEDGE, type KnowledgeType } from "../lib/enums.ts";
import {
  KNOWLEDGE_WEIGHT,
  ABILITY_WEIGHT,
  ABILITY_DECAY_THRESHOLD,
  FATIGUE_FROM_PRESSURE,
  ALPHA1,
  KNOWLEDGE_ABILITY_START,
} from "../lib/constants.ts";

interface TempModifiers {
  thinking: number;
  coding: number;
  mental: number;
  knowledge: Record<KnowledgeType, number>;
  constmental: number;
}

interface TalentWindow extends Window {
  __OI_DEBUG_TALENTS?: boolean;
  TalentManager?: {
    handleStudentEvent?: (student: Student, eventName: string, ctx?: unknown) => unknown;
  };
  _talentHandlers?: Record<string, (student: Student, eventName: string, ctx?: unknown) => unknown>;
}

export interface StudentVisualAssets {
  avatarTexture: Texture;
  statusRingTexture: Texture;
  ready: Promise<void>;
}

const DEFAULT_AVATAR_TEXTURE = "/assets/textures/WOOD 1_0.jpeg";
const DEFAULT_STATUS_TEXTURE = "/assets/textures/WOOD 1_0.jpeg";
const FALLBACK_STATUS_COLOR = 0x7cc5ff;

export class Student {
  name: string;
  // base attributes
  private _baseThinking: number;
  private _baseCoding: number;
  private _baseMental: number;
  // in-contest attributes
  thinking!: number;
  coding!: number;
  mental!: number;

  private _tempModifiers: TempModifiers;
  talents: Set<string>; // TODO: add `talents.ts` and use TalentType here
  knowledge: Record<KnowledgeType, number>;
  pressure: number;
  comfort: number;
  comfort_modifier: number;
  pressure_modifier: number;
  burnout_weeks: number;
  depression_count: number;
  high_pressure_weeks: number;
  active: boolean;
  sick_weeks: number;
  visuals: StudentVisualAssets;
  seatId: number | null;

  private static textureAssets: StudentVisualAssets | null = null;

  constructor(name: string, thinking: number, coding: number, mental: number){
    this.name = name;
    this._baseThinking = thinking;
    this._baseCoding = coding;
    this._baseMental = mental;

    this._tempModifiers = {
      thinking: 0,
      coding: 0,
      mental: 0,
      knowledge: {
        DP: 0,
        DS: 0,
        Math: 0,
        Graph: 0,
        String: 0,
      },
      constmental: 0
    };

    // Object.defineProperty(this, "thinking", {
    //   get: () => this._baseThinking + (this._tempModifiers.thinking || 0),
    //   set: (val: number) => { this._baseThinking = val; },
    //   enumerable: true
    // });
    //
    // Object.defineProperty(this, "coding", {
    //   get: () => this._baseCoding + (this._tempModifiers.coding || 0),
    //   set: (val: number) => { this._baseCoding = val; },
    //   enumerable: true
    // });
    //
    // Object.defineProperty(this, "mental", {
    //   get: () => this._baseMental + (this._tempModifiers.mental || 0),
    //   set: (val: number) => { this._baseMental = val; },
    //   enumerable: true
    // });

    this.talents = new Set();
    this.knowledge = {
      DP: KNOWLEDGE_ABILITY_START,
      DS: KNOWLEDGE_ABILITY_START,
      Math: KNOWLEDGE_ABILITY_START,
      Graph: KNOWLEDGE_ABILITY_START,
      String: KNOWLEDGE_ABILITY_START,
    };
    this.pressure = 20;
    this.comfort = 50;
    this.comfort_modifier = 0;
    this.pressure_modifier = 0;
    this.burnout_weeks = 0;
    this.depression_count = 0;
    this.high_pressure_weeks = 0;
    this.active = true;
    this.sick_weeks = 0;
    this.seatId = null;

    // Lightweight 3D support: load shared textures so avatars/status rings can bind quickly.
    this.visuals = Student.ensureVisualAssets();
  }

  // applyTempModifier(attribute: keyof TempModifiers, value: number): void{
  //   if(typeof this._tempModifiers[attribute] !== "undefined"){
  //     this._tempModifiers[attribute] = value;
  //   }
  // }

  // clearTempModifiers(): void{
  //   for(const key in this._tempModifiers){
  //     this._tempModifiers[key as keyof TempModifiers] = 0;
  //   }
  //   this._talent_backup = {};
  //   this._talent_state = {};
  // }

  // getTempModifier(attribute: keyof TempModifiers): number{
  //   return this._tempModifiers[attribute] || 0;
  // }

  getAbilityAvg(): number{
    return (this.thinking + this.coding + this.mental) / 3.0;
  }

  getKnowledgeTotal(): number{
    return Object.values(this.knowledge).reduce((acc, current) => acc + current, 0)
      / Object.keys(this.knowledge).length;
  }

  getComprehensiveAbility(): number{
    const thinking = Number(this.thinking || 0);
    const coding = Number(this.coding || 0);
    const mental = Number(this.mental || 0);
    const abilityPart = thinking * 0.55 + coding * 0.35 + mental * 0.10;
    const knowledgeTotal = this.getKnowledgeTotal();
    return ABILITY_WEIGHT * abilityPart + KNOWLEDGE_WEIGHT * knowledgeTotal;
  }

  getMentalIndex(): number{
    const noise = normal(0, 3.0);
    const mentalBase = this._baseMental + (this._tempModifiers.constmental || 0);
    const result = mentalBase - ALPHA1 * (this.pressure / 100.0) * (1 - this.comfort / 100.0) + noise;
    return clamp(result, 0, 100);
  }

  getPerformanceScore(difficulty: number, maxScore: number, knowledgeValue: number): number{
    const comprehensive = this.getComprehensiveAbility();
    const mentalIdx = this.getMentalIndex();
    const knowledgeRequirement = Math.max(15, difficulty * 0.35);
    let knowledgePenalty = 1.0;
    if(knowledgeValue < knowledgeRequirement){
      const knowledgeGap = knowledgeRequirement - knowledgeValue;
      knowledgePenalty = Math.exp(-knowledgeGap / 15.0);
      knowledgePenalty = Math.max(0.05, knowledgePenalty);
    }

    const knowledgeBonus = knowledgeValue * 0.5;
    const effectiveAbility = comprehensive + knowledgeBonus;
    let performanceRatio = sigmoid((effectiveAbility - difficulty) / 10.0);
    performanceRatio = performanceRatio * knowledgePenalty;

    const stabilityFactor = mentalIdx / 100.0;
    const baseNoise = 0.05;
    const sigmaPerformance = (100 - mentalIdx) / 200.0 + baseNoise;
    const randomFactor = normal(0, sigmaPerformance);
    const finalRatio = clamp(performanceRatio * stabilityFactor * (1 + randomFactor), 0, 1);
    return Math.max(0, finalRatio * maxScore);
  }

  calculateKnowledgeGain(base_gain: number, facility_bonus: number, sick_penalty: number): number{
    const learning_efficiency = (0.6 * (this.thinking / 100.0) + 0.4) * (1.0 - this.pressure / FATIGUE_FROM_PRESSURE);
    return Math.floor(base_gain * learning_efficiency * facility_bonus * sick_penalty);
  }

  addKnowledge(type: KnowledgeType, amount: number): void{
    const safeAmount = Math.min(Math.max(0, amount), 100);
    if(safeAmount !== amount && Math.abs(amount) > 0.01){
      console.warn(`[addKnowledge] 学生${this.name} 知识点增幅异常: type=${type}, 原值=${amount}, 限制后=${safeAmount}`);
    }

    this.knowledge[type] += safeAmount;
  }

  addThinking(amount: number): void{
    if(Math.abs(amount) < 1e-9) return;
    const cur = this.thinking;
    let mult = 1.0;
    if(cur > ABILITY_DECAY_THRESHOLD){
      mult = Math.min(1.0, ABILITY_DECAY_THRESHOLD / cur);
    }
    this.thinking += amount * mult;
  }

  addCoding(amount: number): void{
    if(Math.abs(amount) < 1e-9) return;
    const cur = this.coding;
    let mult = 1.0;
    if(cur > ABILITY_DECAY_THRESHOLD){
      mult = Math.min(1.0, ABILITY_DECAY_THRESHOLD / cur);
    }
    this.coding += amount * mult;
  }

  addTalent(talentName: string): void{
    this.talents.add(talentName);
  }

  removeTalent(talentName: string): void{
    this.talents.delete(talentName);
  }

  hasTalent(talentName: string): boolean{
    return this.talents.has(talentName);
  }

  triggerTalents(eventName: string, ctx?: unknown): Array<{ talent: string; result: unknown }>{
    const win = typeof window !== "undefined" ? (window as TalentWindow) : undefined;
    try{
      if(win?.__OI_DEBUG_TALENTS){
        console.debug(`[TALENT DEBUG] triggerTalents called for ${this.name} event=${eventName} ctx=`, ctx);
      }
      if(win?.TalentManager?.handleStudentEvent){
        const results = win.TalentManager.handleStudentEvent(this, eventName, ctx);
        if(win?.__OI_DEBUG_TALENTS){
          console.debug(`[TALENT DEBUG] TalentManager returned for ${this.name}:`, results);
        }
        return (results as Array<{ talent: string; result: unknown }>) || [];
      }
      if(win?._talentHandlers){
        const results: Array<{ talent: string; result: unknown }> = [];
        for(const t of this.talents){
          const handler = win._talentHandlers[t];
          if(typeof handler === "function"){
            try{
              const res = handler(this, eventName, ctx);
              if(win?.__OI_DEBUG_TALENTS){
                console.debug(`[TALENT DEBUG] handler ${t} returned for ${this.name}:`, res);
              }
              if(res) results.push({ talent: t, result: res });
            }catch(e){
              console.error("talent handler error", e);
            }
          }
        }
        if(win?.__OI_DEBUG_TALENTS){
          console.debug(`[TALENT DEBUG] aggregated results for ${this.name}:`, results);
        }
        return results;
      }
    }catch(e){
      console.error("triggerTalents error", e);
    }
    return [];
  }

  private static ensureVisualAssets(): StudentVisualAssets{
    if(Student.textureAssets){
      return Student.textureAssets;
    }

    const loader = new TextureLoader();
    const assets: StudentVisualAssets = {
      avatarTexture: buildSolidTexture(0xffffff),
      statusRingTexture: buildSolidTexture(FALLBACK_STATUS_COLOR),
      ready: Promise.resolve()
    };

    const avatarPromise = loader.loadAsync(DEFAULT_AVATAR_TEXTURE).catch(err => {
      console.error("[student] failed to load avatar texture", err);
      return null;
    });

    const statusPromise = loader.loadAsync(DEFAULT_STATUS_TEXTURE).catch(err => {
      console.error("[student] failed to load status ring texture", err);
      return null;
    });

    assets.ready = Promise.all([avatarPromise, statusPromise]).then(([avatar, status]) => {
      if(avatar){
        avatar.colorSpace = SRGBColorSpace;
        assets.avatarTexture = avatar;
      }
      if(status){
        status.colorSpace = SRGBColorSpace;
        assets.statusRingTexture = status;
      }else if(avatar){
        assets.statusRingTexture = avatar.clone();
        assets.statusRingTexture.needsUpdate = true;
      }
    });

    Student.textureAssets = assets;
    return assets;
  }
}

function clamp(value: number, min: number, max: number): number{
  if(Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function sigmoid(x: number): number{
  return 1 / (1 + Math.exp(-x));
}

function normal(mean = 0, std = 1): number{
  const u1 = Math.random() || Number.EPSILON;
  const u2 = Math.random() || Number.EPSILON;
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * std + mean;
}

function buildSolidTexture(color: number): Texture{
  const data = new Uint8Array([
    (color >> 16) & 255,
    (color >> 8) & 255,
    color & 255,
    255
  ]);
  const texture = new DataTexture(data, 1, 1, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
