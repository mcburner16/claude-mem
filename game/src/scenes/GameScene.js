import { Base } from '../entities/Base.js';
import { Unit } from '../entities/Unit.js';
import { AISystem } from '../systems/AISystem.js';
import { UNIT_DEFS, PLAYER_DECK } from '../data/units.js';

const W = 800;
const H = 500;
const LANE_Y = H / 2;
const PLAYER_BASE_X = 60;
const ENEMY_BASE_X = W - 60;
const MAX_ENERGY = 10;
const ENERGY_RATE = 0.8; // per second

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.W = W;
    this.H = H;

    // background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a1a2e);
    this.drawLane();

    // bases
    this.playerBase = new Base(this, PLAYER_BASE_X, LANE_Y, true);
    this.enemyBase = new Base(this, ENEMY_BASE_X, LANE_Y, false);

    // units
    this.playerUnits = [];
    this.enemyUnits = [];

    // energy
    this.playerEnergy = MAX_ENERGY;
    this.enemyEnergy = MAX_ENERGY;

    // AI
    this.ai = new AISystem(this);

    // UI overlay (separate scene)
    this.scene.launch('UIScene', { gameScene: this });

    this.gameOver = false;
  }

  drawLane() {
    // ground
    this.add.rectangle(W / 2, LANE_Y, W, 100, 0x2d4a22);
    // lane markers
    for (let x = 0; x < W; x += 80) {
      this.add.rectangle(x, LANE_Y, 2, 100, 0x3d5a32).setAlpha(0.4);
    }
    // center line
    this.add.rectangle(W / 2, LANE_Y, 3, 100, 0xffffff).setAlpha(0.15);
  }

  deployUnit(key, isPlayer) {
    const def = UNIT_DEFS[key];
    const spawnX = isPlayer ? PLAYER_BASE_X + 50 : ENEMY_BASE_X - 50;
    const spawnY = LANE_Y + Phaser.Math.Between(-20, 20);
    const unit = new Unit(this, spawnX, spawnY, def, isPlayer);

    if (isPlayer) this.playerUnits.push(unit);
    else this.enemyUnits.push(unit);
  }

  tryPlayerDeploy(key) {
    if (this.gameOver) return false;
    const cost = UNIT_DEFS[key].cost;
    if (this.playerEnergy < cost) return false;
    this.playerEnergy -= cost;
    this.deployUnit(key, true);
    return true;
  }

  onBaseDestroyed(isPlayerBase) {
    this.gameOver = true;
    this.scene.get('UIScene').showResult(isPlayerBase ? 'DEFEAT' : 'VICTORY');
  }

  update(time, delta) {
    if (this.gameOver) return;

    // regen energy
    this.playerEnergy = Math.min(MAX_ENERGY, this.playerEnergy + ENERGY_RATE * (delta / 1000));
    this.enemyEnergy = Math.min(MAX_ENERGY, this.enemyEnergy + ENERGY_RATE * (delta / 1000));

    // AI turn
    const aiDeploy = (key) => this.deployUnit(key, false);
    this.enemyEnergy = this.ai.update(delta, this.enemyEnergy, aiDeploy);

    // update units
    const livePlayers = this.playerUnits.filter(u => u.alive);
    const liveEnemies = this.enemyUnits.filter(u => u.alive);

    for (const u of livePlayers) u.update(delta, liveEnemies, this.enemyBase);
    for (const u of liveEnemies) u.update(delta, livePlayers, this.playerBase);

    // clean dead
    this.playerUnits = livePlayers;
    this.enemyUnits = liveEnemies;

    // push energy to UI
    this.events.emit('energyUpdate', this.playerEnergy, MAX_ENERGY);
  }
}
