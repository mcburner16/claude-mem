import { UNIT_DEFS, PLAYER_DECK } from '../data/units.js';

const W = 800;
const H = 500;
const CARD_W = 90;
const CARD_H = 128;
const CARD_Y = H - 72;
const CARD_SPACING = CARD_W + 10;

export class UIScene extends Phaser.Scene {
  constructor() { super('UIScene'); }

  init(data) {
    this.gameScene = data.gameScene;
  }

  create() {
    const gs = this.gameScene;

    // === ENERGY BAR (Force Arena style) ===
    // Panel background
    this.add.rectangle(W / 2, H - 162, 320, 30, 0x080c18).setDepth(10).setStrokeStyle(1, 0x1a2a55);

    // Lightning bolt label
    this.add.text(W / 2 - 148, H - 162, '⚡', {
      fontSize: '16px', fill: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    // Bar track
    this.add.rectangle(W / 2 + 10, H - 162, 260, 14, 0x0a1030).setDepth(10).setStrokeStyle(1, 0x1a2a55);

    // Filled bar
    this.energyBar = this.add.rectangle(W / 2 - 120, H - 162, 0, 10, 0x2266cc)
      .setOrigin(0, 0.5).setDepth(11);

    // Numeric readout
    this.energyNum = this.add.text(W / 2 + 148, H - 162, '10.0', {
      fontSize: '11px', fill: '#88aaff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    // === CARDS ===
    this.cards = [];
    const totalW = PLAYER_DECK.length * CARD_SPACING - 10;
    const startX = W / 2 - totalW / 2;

    PLAYER_DECK.forEach((key, i) => {
      const def = UNIT_DEFS[key];
      const cx = startX + i * CARD_SPACING + CARD_W / 2;
      const card = this.createCard(cx, CARD_Y, def, key);
      this.cards.push({ key, def, ...card });
    });

    // Energy events
    gs.events.on('energyUpdate', (current, max) => {
      this.energyBar.width = 240 * (current / max);
      // Pulse color at low energy
      const col = current < 2 ? 0x882222 : current < 5 ? 0x225588 : 0x2266cc;
      this.energyBar.setFillStyle(col);
      this.energyNum.setText(current.toFixed(1));
      this.updateCardStates(current);
    });

    // === RESULT OVERLAY ===
    this.resultOverlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000).setAlpha(0).setDepth(20);
    this.resultText = this.add.text(W / 2, H / 2 - 38, '', {
      fontSize: '52px', fill: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(21).setAlpha(0);
    this.roundText = this.add.text(W / 2, H / 2 + 22, '', {
      fontSize: '13px', fill: '#aaccff', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(21).setAlpha(0);
    this.restartText = this.add.text(W / 2, H / 2 + 50, 'Tap to play again', {
      fontSize: '18px', fill: '#aaaaaa', fontFamily: 'monospace',
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
    // Card frame
    const bg = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x0d1120).setDepth(10);
    bg.setStrokeStyle(2, 0x2a3888);
    bg.setInteractive({ useHandCursor: true });

    // Portrait area (top half)
    this.add.rectangle(cx, cy - 26, CARD_W, 76, 0x080c18).setDepth(11);

    // Unit color glow halo
    const glow = this.add.circle(cx, cy - 30, def.size + 12, def.color, 0.18).setDepth(11);

    // Unit icon
    const icon = this.add.circle(cx, cy - 30, def.size + 5, def.color).setDepth(12);
    // Specular highlight
    this.add.circle(cx - def.size * 0.35, cy - 30 - def.size * 0.3, def.size * 0.38, 0xffffff, 0.28).setDepth(13);

    // Separator line
    this.add.rectangle(cx, cy + 12, CARD_W - 8, 1, 0x2a3888, 0.6).setDepth(11);

    // Unit name
    const label = this.add.text(cx, cy + 24, def.label.toUpperCase(), {
      fontSize: '10px', fill: '#ccd6ff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(12);

    // Description
    this.add.text(cx, cy + 40, def.description, {
      fontSize: '7px', fill: '#6677aa', fontFamily: 'monospace',
      wordWrap: { width: CARD_W - 10 }, align: 'center',
    }).setOrigin(0.5).setDepth(12);

    // Cost badge (bottom-left corner)
    this.add.rectangle(cx - CARD_W / 2 + 18, cy + CARD_H / 2 - 15, 34, 20, 0x112255).setDepth(12)
      .setStrokeStyle(1, 0x3355aa);
    const costText = this.add.text(cx - CARD_W / 2 + 18, cy + CARD_H / 2 - 15, `⚡${def.cost}`, {
      fontSize: '11px', fill: '#66aaff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(13);

    // Dim overlay when can't afford
    const overlay = this.add.rectangle(cx, cy, CARD_W, CARD_H, 0x000033).setAlpha(0).setDepth(14);

    bg.on('pointerover', () => {
      if (!overlay.alpha) {
        bg.setStrokeStyle(2, 0x88aaff);
        glow.setAlpha(0.38);
      }
    });
    bg.on('pointerout', () => {
      if (!overlay.alpha) {
        bg.setStrokeStyle(2, 0x2a3888);
        glow.setAlpha(0.18);
      }
    });
    bg.on('pointerdown', () => {
      if (this.gameOver) return;
      const success = this.gameScene.tryPlayerDeploy(key);
      if (success) this.flashCard(bg, glow);
    });

    return { bg, icon, glow, label, costText, overlay };
  }

  flashCard(bg, glow) {
    this.tweens.add({
      targets: bg,
      scaleX: 0.90, scaleY: 0.90,
      duration: 70,
      yoyo: true,
    });
    this.tweens.add({
      targets: glow,
      alpha: 0.7,
      duration: 70,
      yoyo: true,
    });
  }

  updateCardStates(energy) {
    for (const card of this.cards) {
      const canAfford = energy >= card.def.cost;
      card.overlay.setAlpha(canAfford ? 0 : 0.6);
      card.bg.setStrokeStyle(2, canAfford ? 0x2a3888 : 0x0d1130);
      card.glow.setAlpha(canAfford ? 0.18 : 0.04);
      card.icon.setAlpha(canAfford ? 1 : 0.45);
    }
  }

  showResult(result, streak = 0, round = 1) {
    this.gameOver = true;
    const color = result === 'VICTORY' ? '#44ff88' : '#ff4444';
    this.resultText.setText(result).setFill(color);
    let sub = `Round ${round}`;
    if (streak > 1) sub += `   ★ ${streak} Win Streak`;
    else if (result === 'VICTORY') sub += '   First win!';
    this.roundText.setText(sub);
    this.tweens.add({ targets: this.resultOverlay, alpha: 0.78, duration: 400 });
    this.tweens.add({ targets: [this.resultText, this.roundText, this.restartText], alpha: 1, duration: 600, delay: 200 });
  }
}
