export class Base {
  constructor(scene, x, y, isPlayer) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.alive = true;
    this.x = x;
    this.y = y;

    const teamColor  = isPlayer ? 0x2255cc : 0xcc2222;
    const darkColor  = isPlayer ? 0x0e1844 : 0x44110a;
    const accentColor = isPlayer ? 0x4488ff : 0xff4444;
    const dir = isPlayer ? 1 : -1;

    const g = scene.add.graphics().setDepth(3);

    // Glow aura
    g.fillStyle(teamColor, 0.07);
    g.fillCircle(x, y, 95);
    g.fillStyle(teamColor, 0.04);
    g.fillCircle(x, y, 140);

    // Foundation slab
    g.fillStyle(0x181818, 1);
    g.fillRect(x - 36, y + 50, 72, 12);

    // Main tower body
    g.fillStyle(darkColor, 1);
    g.fillRect(x - 34, y - 62, 68, 116);

    // Outer armor panels
    g.fillStyle(teamColor, 1);
    g.fillRect(x - 30, y - 58, 60, 108);

    // Panel lines / detail
    g.lineStyle(1.5, accentColor, 0.4);
    g.strokeRect(x - 30, y - 58, 60, 108);
    g.lineStyle(1, accentColor, 0.2);
    g.lineBetween(x - 30, y - 20, x + 30, y - 20);
    g.lineBetween(x - 30, y + 20, x + 30, y + 20);

    // Battlements (merlons)
    g.fillStyle(teamColor, 1);
    for (let i = 0; i < 5; i++) {
      g.fillRect(x - 30 + i * 13, y - 78, 8, 18);
    }
    g.fillStyle(darkColor, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(x - 25 + i * 13, y - 78, 5, 18);
    }

    // Cannon / turret
    g.fillStyle(0x1a1a1a, 1);
    if (isPlayer) {
      g.fillRect(x + 22, y - 12, 26, 12);
      g.fillRect(x + 18, y - 22, 14, 10);
    } else {
      g.fillRect(x - 48, y - 12, 26, 12);
      g.fillRect(x - 32, y - 22, 14, 10);
    }
    g.lineStyle(1, 0x444444, 0.8);
    if (isPlayer) {
      g.strokeRect(x + 22, y - 12, 26, 12);
    } else {
      g.strokeRect(x - 48, y - 12, 26, 12);
    }

    // Lit windows
    g.fillStyle(accentColor, 0.85);
    g.fillRect(x - 18, y - 44, 10, 10);
    g.fillRect(x +  8, y - 44, 10, 10);
    g.fillRect(x - 18, y - 24, 10, 10);
    g.fillRect(x +  8, y - 24, 10, 10);
    // Door arch
    g.fillRect(x - 8, y + 8, 16, 28);
    // Inner window glow
    g.fillStyle(0xffffff, 0.3);
    g.fillRect(x - 16, y - 42, 6, 6);
    g.fillRect(x + 10, y - 42, 6, 6);

    // Destroy overlay (shown on death)
    this.destroyOverlay = scene.add.rectangle(x, y - 8, 72, 124, 0x000000)
      .setAlpha(0).setDepth(4);

    // HP bar
    this.hpBg = scene.add.rectangle(x, y - 100, 72, 8, 0x111111)
      .setDepth(8).setStrokeStyle(1, 0x333333);
    this.hpBar = scene.add.rectangle(x, y - 100, 72, 6, 0x00ff44).setDepth(9);

    scene.add.text(x, y + 70, isPlayer ? 'BASE' : 'ENEMY', {
      fontSize: '10px',
      fill: isPlayer ? '#88aaff' : '#ff8888',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(4);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    const pct = this.hp / this.maxHp;
    this.hpBar.width = 72 * pct;
    this.hpBar.setFillStyle(pct > 0.5 ? 0x00ff44 : pct > 0.25 ? 0xffaa00 : 0xff2200);
    if (this.hp <= 0) {
      this.alive = false;
      this.destroyOverlay.setAlpha(0.65);
      this.scene.onBaseDestroyed(this.isPlayer);
    }
  }
}
