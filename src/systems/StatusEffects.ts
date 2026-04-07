import { BaseEnemy } from '../entities/enemies/BaseEnemy';

export interface StatusEffect {
  type: 'slow';
  magnitude: number; // e.g. 0.3 = 30% slow
  duration: number;  // total duration ms
  remaining: number; // remaining ms
}

export class StatusEffectManager {
  private effects: Map<BaseEnemy, StatusEffect[]> = new Map();

  applyEffect(enemy: BaseEnemy, effect: Omit<StatusEffect, 'remaining'>) {
    if (!enemy.alive) return;
    let list = this.effects.get(enemy);
    if (!list) {
      list = [];
      this.effects.set(enemy, list);
    }
    // Refresh existing effect of same type (don't stack magnitude)
    const existing = list.find(e => e.type === effect.type);
    if (existing) {
      existing.remaining = effect.duration;
      existing.magnitude = Math.max(existing.magnitude, effect.magnitude);
    } else {
      list.push({ ...effect, remaining: effect.duration });
    }
    this.recalcSpeed(enemy);
  }

  update(delta: number) {
    for (const [enemy, list] of this.effects) {
      if (!enemy.alive) {
        this.effects.delete(enemy);
        continue;
      }
      let changed = false;
      for (let i = list.length - 1; i >= 0; i--) {
        list[i].remaining -= delta;
        if (list[i].remaining <= 0) {
          list.splice(i, 1);
          changed = true;
        }
      }
      if (list.length === 0) {
        this.effects.delete(enemy);
        changed = true;
      }
      if (changed) this.recalcSpeed(enemy);
    }
  }

  private recalcSpeed(enemy: BaseEnemy) {
    const list = this.effects.get(enemy);
    if (!list || list.length === 0) {
      enemy.speedMultiplier = 1.0;
      enemy.slowed = false;
      return;
    }
    let mult = 1.0;
    for (const e of list) {
      if (e.type === 'slow') {
        mult = Math.min(mult, 1 - e.magnitude);
      }
    }
    enemy.speedMultiplier = mult;
    enemy.slowed = true;
  }

  isSlowed(enemy: BaseEnemy): boolean {
    const list = this.effects.get(enemy);
    return !!list && list.some(e => e.type === 'slow');
  }

  cleanup(enemy: BaseEnemy) {
    this.effects.delete(enemy);
  }
}
