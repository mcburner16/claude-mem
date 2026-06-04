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
    this.state = 'march';
    this._bobPhase = Math.random() * Math.PI * 2;

    this.gfx = scene.add.graphics().setDepth(5);

    const shadowColor = isPlayer ? 0x1133aa : 0xaa1100;
    this.shadow = scene.add.ellipse(x, y + def.size * 0.9, def.size * 2.6, def.size * 0.75, shadowColor, 0.24).setDepth(4);

    this.drawCharacter();

    const s = def.size;
    this.hpBg = scene.add.rectangle(x, y - s * 2.5, s * 2.4, 4, 0x333333).setDepth(6);
    this.hpBar = scene.add.rectangle(x, y - s * 2.5, s * 2.4, 4, 0x00ff00).setDepth(7);

    this.x = x;
    this.y = y;
    this._setDepth();
    this.gfx.setPosition(x, y);
  }

  _setDepth() {
    // Y-based painter's algorithm: units lower on screen (higher Y) render in front
    const d = 5 + this.y * 0.018;
    this.gfx.setDepth(d);
    this.shadow.setDepth(d - 0.5);
    this.hpBg.setDepth(d + 1);
    this.hpBar.setDepth(d + 1.5);
  }

  drawCharacter() {
    const g = this.gfx;
    const def = this.def;
    const isPlayer = this.isPlayer;
    const s = def.size;
    const dir = isPlayer ? 1 : -1;
    const teamColor = isPlayer ? 0x2255cc : 0xcc2222;
    const armorColor = def.color;

    g.clear();

    // --- legs ---
    g.fillStyle(teamColor, 1);
    g.fillRect(-s * 0.45, s * 0.15, s * 0.38, s * 0.85);
    g.fillRect(s * 0.07, s * 0.15, s * 0.38, s * 0.85);

    // --- boots ---
    g.fillStyle(0x222222, 1);
    g.fillRect(-s * 0.45, s * 0.85, s * 0.42, s * 0.3);
    g.fillRect(s * 0.07, s * 0.85, s * 0.42, s * 0.3);

    // --- body / armor ---
    g.fillStyle(armorColor, 1);
    if (def.key === 'heavy') {
      g.fillRect(-s * 0.75, -s * 1.1, s * 1.5, s * 1.25);
    } else {
      g.fillRect(-s * 0.55, -s * 1.0, s * 1.1, s * 1.15);
    }

    // --- body outline ---
    g.lineStyle(1.5, 0xffffff, 0.25);
    if (def.key === 'heavy') {
      g.strokeRect(-s * 0.75, -s * 1.1, s * 1.5, s * 1.25);
    } else {
      g.strokeRect(-s * 0.55, -s * 1.0, s * 1.1, s * 1.15);
    }

    // --- neck ---
    g.fillStyle(0xffcc99, 1);
    g.fillRect(-s * 0.15, -s * 1.3, s * 0.3, s * 0.25);

    // --- head ---
    const headR = def.key === 'heavy' ? s * 0.75 : s * 0.62;
    g.fillStyle(0xffcc99, 1);
    g.fillCircle(0, -s * 1.8, headR);

    // --- helmet ---
    g.fillStyle(teamColor, 1);
    g.fillRect(-headR * 1.05, -s * 1.8 - headR * 0.9, headR * 2.1, headR * 1.0);
    g.fillCircle(0, -s * 1.8 - headR * 0.1, headR * 1.05);

    // --- visor ---
    g.fillStyle(0x88ccff, 0.7);
    g.fillRect(dir * headR * 0.05, -s * 1.8 - headR * 0.25, dir * headR * 0.85, headR * 0.35);

    // --- weapon ---
    g.fillStyle(0x444444, 1);
    if (def.key === 'sniper') {
      g.fillRect(dir * s * 0.5, -s * 0.75, dir * s * 2.4, 3);
      g.fillRect(dir * s * 0.5, -s * 0.9, dir * s * 0.6, s * 0.18);
    } else if (def.key === 'heavy') {
      g.fillRect(dir * s * 0.7, -s * 0.7, dir * s * 1.2, 6);
      g.fillRect(dir * s * 0.5, -s * 0.85, dir * s * 0.5, s * 0.3);
    } else if (def.key === 'scout') {
      g.fillRect(dir * s * 0.5, -s * 0.65, dir * s * 0.9, 3);
    } else {
      g.fillRect(dir * s * 0.5, -s * 0.72, dir * s * 1.5, 4);
      g.fillRect(dir * s * 0.5, -s * 0.88, dir * s * 0.5, s * 0.2);
    }

    // chest stripe
    g.fillStyle(isPlayer ? 0x88ccff : 0xff8888, 0.7);
    g.fillRect(-s * 0.18, -s * 0.85, s * 0.36, s * 0.22);
  }

  moveTo(x, y) {
    this.x = x;
    this.y = y;
    this._setDepth();
    this.gfx.setPosition(x, y);
    this.shadow.setPosition(x, y + this.def.size * 0.9);
    this.hpBg.setPosition(x, y - this.def.size * 2.5);
    this.hpBar.setPosition(x, y - this.def.size * 2.5);
  }

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    const pct = this.hp / this.maxHp;
    this.hpBar.width = this.def.size * 2.4 * pct;
    this.hpBar.setFillStyle(pct > 0.5 ? 0x00ff00 : pct > 0.25 ? 0xffaa00 : 0xff2200);
    if (this.hp <= 0) this.destroy();
  }

  destroy() {
    this.alive = false;
    if (this.scene.showDeathEffect) {
      this.scene.showDeathEffect(this.x, this.y, this.isPlayer ? 0x2255cc : 0xcc2222);
    }
    this.gfx.destroy();
    this.shadow.destroy();
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

    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = this.distanceTo(e);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }

    const rangeWithBase = this.def.attackRange + 30;

    if (nearest && nearestDist <= this.def.attackRange) {
      this.state = 'attack';
      if (this.attackCooldown <= 0) {
        nearest.takeDamage(this.def.damage);
        this.attackCooldown = this.def.attackRate;
        this.flashAttack();
        if (this.scene.showProjectile) {
          this.scene.showProjectile(this.x, this.y, nearest.x, nearest.y, this.isPlayer);
        }
      }
    } else if (!nearest && enemyBase && this.distanceTo({ x: enemyBase.x, y: enemyBase.y }) <= rangeWithBase) {
      this.state = 'attack';
      if (this.attackCooldown <= 0) {
        enemyBase.takeDamage(this.def.damage);
        this.attackCooldown = this.def.attackRate;
        this.flashAttack();
        if (this.scene.showProjectile) {
          this.scene.showProjectile(this.x, this.y, enemyBase.x, enemyBase.y, this.isPlayer);
        }
      }
    } else {
      this.state = 'march';
      const dir = this.isPlayer ? 1 : -1;
      const speed = this.def.speed * (delta / 1000);
      this.moveTo(this.x + dir * speed, this.y);

      // Walk bob — offset by phase so each unit is at a different step
      const bob = Math.sin(Date.now() * 0.008 + this._bobPhase) * 2;
      this.gfx.setY(this.y + bob);
    }
  }

  flashAttack() {
    this.scene.tweens.add({
      targets: this.gfx,
      scaleX: 1.3, scaleY: 1.3,
      duration: 80,
      yoyo: true,
    });
  }
}
