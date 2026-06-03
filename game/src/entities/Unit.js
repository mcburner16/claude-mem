export class Unit {
  constructor(scene, x, y, def, isPlayer) {
    this.scene = scene;
    this.def = def;
    this.isPlayer = isPlayer;
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.alive = true;
    this.target = null;
    this.attackCooldown = 0;
    this.state = 'march'; // march | attack

    this.circle = scene.add.circle(x, y, def.size, def.color).setDepth(5);
    this.circle.setStrokeStyle(2, isPlayer ? 0xaaccff : 0xffaaaa);

    this.hpBar = scene.add.rectangle(x, y - def.size - 6, def.size * 2, 4, 0x00ff00).setDepth(6);
    this.hpBg = scene.add.rectangle(x, y - def.size - 6, def.size * 2, 4, 0x333333).setDepth(5);

    this.x = x;
    this.y = y;
  }

  get pos() { return { x: this.x, y: this.y }; }

  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this.circle.setPosition(x, y);
    this.hpBg.setPosition(x, y - this.def.size - 6);
    this.hpBar.setPosition(x, y - this.def.size - 6);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    const pct = this.hp / this.maxHp;
    this.hpBar.width = this.def.size * 2 * pct;
    this.hpBar.setFillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffaa00 : 0xff2200);
    if (this.hp <= 0) this.destroy();
  }

  destroy() {
    this.alive = false;
    this.circle.destroy();
    this.hpBar.destroy();
    this.hpBg.destroy();
  }

  distanceTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  update(delta, enemies, enemyBase) {
    if (!this.alive) return;

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    // find nearest living enemy
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = this.distanceTo(e);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    const rangeWithBase = this.def.attackRange + 30;

    if (nearest && nearestDist <= this.def.attackRange) {
      // attack unit
      this.state = 'attack';
      this.target = nearest;
      if (this.attackCooldown <= 0) {
        nearest.takeDamage(this.def.damage);
        this.attackCooldown = this.def.attackRate;
        this.flashAttack();
      }
    } else if (!nearest && enemyBase && this.distanceTo({ x: enemyBase.x, y: enemyBase.y }) <= rangeWithBase) {
      // attack base
      this.state = 'attack';
      if (this.attackCooldown <= 0) {
        enemyBase.takeDamage(this.def.damage);
        this.attackCooldown = this.def.attackRate;
        this.flashAttack();
      }
    } else {
      // march toward enemy base
      this.state = 'march';
      const dir = this.isPlayer ? 1 : -1;
      const speed = this.def.speed * (delta / 1000);
      this.moveTo(this.x + dir * speed, this.y);
    }
  }

  flashAttack() {
    this.scene.tweens.add({
      targets: this.circle,
      scaleX: 1.4, scaleY: 1.4,
      duration: 80,
      yoyo: true,
    });
  }
}
