export class Base {
  constructor(scene, x, y, isPlayer) {
    this.scene = scene;
    this.isPlayer = isPlayer;
    this.maxHp = 1000;
    this.hp = this.maxHp;
    this.alive = true;

    const color = isPlayer ? 0x2266ff : 0xff2222;
    this.body = scene.add.rectangle(x, y, 60, 120, color);
    this.body.setStrokeStyle(3, 0xffffff);

    this.hpBar = scene.add.rectangle(x, y - 80, 60, 8, 0x00ff00);
    this.hpBg = scene.add.rectangle(x, y - 80, 60, 8, 0x333333);
    this.hpBg.setDepth(1);
    this.hpBar.setDepth(2);

    this.label = scene.add.text(x, y + 70, isPlayer ? 'BASE' : 'ENEMY', {
      fontSize: '11px', fill: '#ffffff', fontFamily: 'monospace'
    }).setOrigin(0.5);

    this.x = x;
    this.y = y;
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hpBar.width = 60 * (this.hp / this.maxHp);
    this.hpBar.setFillStyle(this.hp > 500 ? 0x00ff00 : this.hp > 250 ? 0xffaa00 : 0xff2200);
    if (this.hp <= 0) {
      this.alive = false;
      this.body.setFillStyle(0x444444);
      this.scene.onBaseDestroyed(this.isPlayer);
    }
  }
}
