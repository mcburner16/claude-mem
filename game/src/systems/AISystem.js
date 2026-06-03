import { UNIT_DEFS, AI_DECK } from '../data/units.js';

export class AISystem {
  constructor(scene) {
    this.scene = scene;
    this.thinkTimer = 0;
    this.thinkInterval = Phaser.Math.Between(2500, 4000);
  }

  update(delta, energy, deployFn) {
    this.thinkTimer += delta;
    if (this.thinkTimer < this.thinkInterval) return energy;

    this.thinkTimer = 0;
    this.thinkInterval = Phaser.Math.Between(2000, 4500);

    // pick affordable card
    const affordable = AI_DECK.filter(k => UNIT_DEFS[k].cost <= energy);
    if (affordable.length === 0) return energy;

    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    deployFn(pick);
    return energy - UNIT_DEFS[pick].cost;
  }
}
