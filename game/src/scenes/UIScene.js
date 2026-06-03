import { UNIT_DEFS, PLAYER_DECK } from '../data/units.js';

const W = 800;
const H = 500;
const CARD_W = 100;
const CARD_H = 110;
const CARD_Y = H - 65;

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const gs = this.gameScene;

    // energy bar background
    this.add.rectangle(W / 2, H - 140, 300, 16, 0x333333).setDepth(10);
    this.energyBar = this.add.rectangle(W / 2 - 150, H - 140, 0, 14, 0x00aaff).setOrigin(0, 0.5).setDepth(11);
    this.energyText = this.add.text(W / 2, H - 153, 'ENERGY', {
      fontSize: '11px', fill: '#88ccff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(11);
    this.energyNum = this.add.text(W / 2, H - 127, '10 / 10', {
      fontSize: '11px', fill: '#aaddff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(11);

    // cards
    this.cards = [];
    const totalW = PLAYER_DECK.length * (CARD_W + 10) - 10;
    const startX = W / 2 - totalW / 2;

    PLAYER_DECK.forEach((key, i) => {
      const def = UNIT_DEFS[key];
      const cx = startX + i * (CARD_W + 10) + CARD_W / 2;
      const card = this.createCard(cx, CARD_Y, def, key);
      this.cards.push({ key, def, ...card });
    });

    // listen for energy updates
    gs.events.on('energyUpdate', (current, max) => {
      this.energyBar.width = 300 * (current / max);
      this.energyNum.setText(`${current.toFixed(1)} / ${max}`);
      this.updateCardStates(current);
    });

    // result overlay (hidden)
    this.resultOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0).setDepth(20);
    this.resultText = this.add.text(W / 2, H / 2 - 30, '', {
      fontSize: '52px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(21).setAlpha(0);
    this.restartText = this.add.text(W / 2, H / 2 + 40, 'Click to play again', {
      fontSize: '18px', fill: '#aaaaaa', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(21).setAlpha(0);

    this.input.on('pointerdown', () => {
      if (this.gameOver) {
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('GameScene');
        this.scene.launch('UIScene', { gameScene: this.scene.get('GameScene') });
      }
    });
  }

  createCard(cx, cy, def, key) {
    const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x222244).setDepth(10);
    bg.setStrokeStyle(2, 0x4455aa);
    bg.setInteractive({ useHandCursor: true });

    const icon = this.add.circle(cx, cy - 20, def.size + 4, def.color).setDepth(11);
    const label = this.add.text(cx, cy + 12, def.label, {
      fontSize: '12px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(11);

    const costLabel = this.add.text(cx, cy + 28, `Cost: ${def.cost}`, {
      fontSize: '10px', fill: '#88aaff', fontFamily: 'monospace'
    }).setOrigin(0.5).setDepth(11);

    const desc = this.add.text(cx, cy + 44, def.description, {
      fontSize: '8px', fill: '#aaaaaa', fontFamily: 'monospace',
      wordWrap: { width: CARD_W - 8 }, align: 'center'
    }).setOrigin(0.5).setDepth(11);

    const overlay = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x000000).setAlpha(0).setDepth(12);

    bg.on('pointerover', () => { if (!overlay.alpha) bg.setStrokeStyle(2, 0xaabbff); });
    bg.on('pointerout', () => { if (!overlay.alpha) bg.setStrokeStyle(2, 0x4455aa); });
    bg.on('pointerdown', () => {
      if (this.gameOver) return;
      const success = this.gameScene.tryPlayerDeploy(key);
      if (success) this.flashCard(bg);
    });

    return { bg, icon, label, costLabel, overlay };
  }

  flashCard(bg) {
    this.tweens.add({
      targets: bg,
      scaleX: 0.92, scaleY: 0.92,
      duration: 80,
      yoyo: true,
    });
  }

  updateCardStates(energy) {
    for (const card of this.cards) {
      const canAfford = energy >= card.def.cost;
      card.overlay.setAlpha(canAfford ? 0 : 0.55);
      card.bg.setStrokeStyle(2, canAfford ? 0x4455aa : 0x222222);
    }
  }

  showResult(result) {
    this.gameOver = true;
    const color = result === 'VICTORY' ? '#44ff88' : '#ff4444';
    this.resultText.setText(result).setFill(color);
    this.tweens.add({ targets: this.resultOverlay, alpha: 0.75, duration: 400 });
    this.tweens.add({ targets: [this.resultText, this.restartText], alpha: 1, duration: 600, delay: 200 });
  }
}
