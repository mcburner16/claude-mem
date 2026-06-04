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
const ENERGY_RATE = 0.8;

export class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }

  create() {
    this.W = W;
    this.H = H;

    this.drawEnvironment();

    this.playerBase = new Base(this, PLAYER_BASE_X, LANE_Y, true);
    this.enemyBase = new Base(this, ENEMY_BASE_X, LANE_Y, false);

    this.playerUnits = [];
    this.enemyUnits = [];

    this.playerEnergy = MAX_ENERGY;
    this.enemyEnergy = MAX_ENERGY;

    this.ai = new AISystem(this);

    this.scene.launch('UIScene', { gameScene: this });

    this.gameOver = false;
  }

  drawEnvironment() {
    const g = this.add.graphics();

    // Deep space background
    g.fillStyle(0x05050d, 1);
    g.fillRect(0, 0, W, H);

    // Stars
    g.fillStyle(0xffffff, 1);
    const stars = [
      [42,14],[88,40],[142,8],[198,58],[255,26],[316,50],[376,16],
      [440,66],[500,33],[558,56],[620,11],[674,38],[730,24],[778,53],
      [62,88],[168,103],[254,83],[398,96],[504,110],[600,86],[720,100],
      [334,43],[482,19],[562,73],[702,63],[290,70],[450,88],[540,30],
    ];
    for (const [sx, sy] of stars) g.fillCircle(sx, sy, 0.9);
    g.fillStyle(0xaaccff, 1);
    for (const [sx, sy] of [[200,35],[560,22],[380,78],[660,50]]) g.fillCircle(sx, sy, 1.4);

    // === CITY SKYLINE SILHOUETTES ===
    g.fillStyle(0x07070f, 1);
    // Left cluster
    g.fillRect(108, 80, 48, 120);
    g.fillRect(104, 72, 56, 12);
    g.fillRect(160, 94, 40, 106);
    g.fillRect(204, 86, 30, 114);
    // Right cluster
    g.fillRect(W - 156, 80, 48, 120);
    g.fillRect(W - 160, 72, 56, 12);
    g.fillRect(W - 200, 94, 40, 106);
    g.fillRect(W - 234, 86, 30, 114);
    // Center background
    g.fillRect(322, 90, 44, 110);
    g.fillRect(380, 102, 32, 98);
    g.fillRect(432, 88, 46, 112);

    // Building windows - warm amber
    g.fillStyle(0xddaa44, 0.6);
    for (const [wx, wy] of [
      [120,88],[120,104],[134,118],[165,100],[165,116],[210,92],[212,108],
      [W-122,88],[W-134,104],[W-148,118],[W-182,100],[W-216,92],[W-218,108],
      [330,96],[330,110],[386,108],[440,94],[442,108],
    ]) g.fillRect(wx, wy, 5, 5);
    // Blue accent windows (player side)
    g.fillStyle(0x88aaff, 0.45);
    for (const [wx, wy] of [[344,112],[394,94],[450,116]]) g.fillRect(wx, wy, 4, 4);
    // Red accent windows (enemy side)
    g.fillStyle(0xff8866, 0.45);
    for (const [wx, wy] of [[W-136,112],[W-192,94],[W-232,116]]) g.fillRect(wx, wy, 4, 4);

    // === TEAM ATMOSPHERIC GLOW ===
    g.fillStyle(0x0822cc, 0.07);
    g.fillRect(0, 0, W * 0.5, H);
    g.fillStyle(0xcc1a06, 0.07);
    g.fillRect(W * 0.5, 0, W * 0.5, H);

    // === GROUND PLANE ===
    const gH = 120;
    const gT = LANE_Y - gH / 2;

    g.fillStyle(0x111a0b, 1);
    g.fillRect(0, gT, W, gH);

    // Depth stripes (front = brighter, gives forced perspective)
    const stripes = [0x131c0d, 0x162010, 0x192312, 0x1c2714, 0x1f2b16];
    for (let i = 0; i < 5; i++) {
      g.fillStyle(stripes[i], 1);
      g.fillRect(0, gT + i * (gH / 5), W, gH / 5 + 1);
    }

    // Vertical grid
    g.lineStyle(1, 0x2a4420, 0.38);
    for (let x = 80; x < W; x += 80) g.lineBetween(x, gT, x, gT + gH);

    // Horizontal depth lines
    g.lineStyle(1, 0x2a4420, 0.22);
    g.lineBetween(0, gT + gH * 0.33, W, gT + gH * 0.33);
    g.lineBetween(0, gT + gH * 0.66, W, gT + gH * 0.66);

    // Center battle line with glow
    g.lineStyle(3, 0x6677ee, 0.13);
    g.lineBetween(W / 2, gT, W / 2, gT + gH);
    g.lineStyle(1, 0x6677ee, 0.07);
    g.lineBetween(W / 2 - 3, gT, W / 2 - 3, gT + gH);
    g.lineBetween(W / 2 + 3, gT, W / 2 + 3, gT + gH);

    // Team ground glow
    g.fillStyle(0x0a28ee, 0.1);
    g.fillRect(0, gT, 115, gH);
    g.fillStyle(0xee1a08, 0.1);
    g.fillRect(W - 115, gT, 115, gH);

    // === CRATE CLUSTERS ===
    this.drawCrates(g, 28,   LANE_Y + 14, 0x8a6820, 0x6a5018);
    this.drawCrates(g, 76,   LANE_Y + 22, 0x9a7828, 0x7a6020);
    this.drawCrates(g, W-28, LANE_Y + 14, 0x8a2820, 0x6a1e18);
    this.drawCrates(g, W-76, LANE_Y + 22, 0x9a3428, 0x7a2820);
  }

  drawCrates(g, cx, cy, light, dark) {
    const w = 36, h = 26;
    // Back crate
    g.fillStyle(dark, 1);
    g.fillRect(cx - 14, cy - h * 2, w - 4, h);
    g.lineStyle(1, 0xffffff, 0.12);
    g.strokeRect(cx - 14, cy - h * 2, w - 4, h);
    g.lineStyle(1, 0xffffff, 0.07);
    g.lineBetween(cx - 14, cy - h * 2, cx + w - 18, cy - h);
    g.lineBetween(cx + w - 18, cy - h * 2, cx - 14, cy - h);
    // Middle crate
    g.fillStyle(light, 1);
    g.fillRect(cx - 16, cy - h, w, h);
    g.lineStyle(1, 0xffffff, 0.12);
    g.strokeRect(cx - 16, cy - h, w, h);
    g.lineStyle(1, 0xffffff, 0.07);
    g.lineBetween(cx - 16, cy - h, cx + w - 16, cy);
    g.lineBetween(cx + w - 16, cy - h, cx - 16, cy);
    // Bottom crate (wider)
    g.fillStyle(dark, 1);
    g.fillRect(cx - 20, cy, w + 8, h - 2);
    g.lineStyle(1, 0xffffff, 0.12);
    g.strokeRect(cx - 20, cy, w + 8, h - 2);
    g.lineStyle(1, 0xffffff, 0.07);
    g.lineBetween(cx - 20, cy, cx + w - 12, cy + h - 2);
    g.lineBetween(cx + w - 12, cy, cx - 20, cy + h - 2);
  }

  showSpawnEffect(x, y, isPlayer) {
    const color = isPlayer ? 0x2266ff : 0xff2222;

    const ring = this.add.ellipse(x, y + 20, 28, 14, color, 0.75).setDepth(4);
    this.tweens.add({
      targets: ring,
      scaleX: 5.5, scaleY: 4,
      alpha: 0,
      duration: 580,
      ease: 'Power2Out',
      onComplete: () => ring.destroy(),
    });

    const beam = this.add.rectangle(x, y - 18, 6, 56, color, 0.7).setDepth(4);
    this.tweens.add({
      targets: beam,
      scaleY: 0.05,
      alpha: 0,
      y: y + 8,
      duration: 340,
      ease: 'Power3In',
      onComplete: () => beam.destroy(),
    });
  }

  deployUnit(key, isPlayer) {
    const def = UNIT_DEFS[key];
    const spawnX = isPlayer ? PLAYER_BASE_X + 50 : ENEMY_BASE_X - 50;
    const spawnY = LANE_Y + Phaser.Math.Between(-22, 22);
    const unit = new Unit(this, spawnX, spawnY, def, isPlayer);

    if (isPlayer) this.playerUnits.push(unit);
    else this.enemyUnits.push(unit);

    this.showSpawnEffect(spawnX, spawnY, isPlayer);
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

    this.playerEnergy = Math.min(MAX_ENERGY, this.playerEnergy + ENERGY_RATE * (delta / 1000));
    this.enemyEnergy = Math.min(MAX_ENERGY, this.enemyEnergy + ENERGY_RATE * (delta / 1000));

    const aiDeploy = (key) => this.deployUnit(key, false);
    this.enemyEnergy = this.ai.update(delta, this.enemyEnergy, aiDeploy);

    const livePlayers = this.playerUnits.filter(u => u.alive);
    const liveEnemies = this.enemyUnits.filter(u => u.alive);

    for (const u of livePlayers) u.update(delta, liveEnemies, this.enemyBase);
    for (const u of liveEnemies) u.update(delta, livePlayers, this.playerBase);

    this.playerUnits = livePlayers;
    this.enemyUnits = liveEnemies;

    this.events.emit('energyUpdate', this.playerEnergy, MAX_ENERGY);
  }
}
