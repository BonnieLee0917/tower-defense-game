import Phaser from 'phaser';
import { STARTING_GOLD } from '../config/gameConfig';

export class EconomyManager {
  private gold: number;
  private scene: Phaser.Scene;
  public onChange?: () => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.gold = STARTING_GOLD;
  }

  getGold(): number { return this.gold; }

  canAfford(cost: number): boolean { return this.gold >= cost; }

  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost;
    this.onChange?.();
    return true;
  }

  earn(amount: number) {
    this.gold += amount;
    this.onChange?.();
  }
}
