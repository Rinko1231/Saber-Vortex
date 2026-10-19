# Saber Vortex 美术提示词与裁切约定

这份文档用于把占位美术换成正式素材。建议先让 GPT Image 生成单张透明背景素材，再由我们裁切、缩放并接入 Phaser。  
如果模型无法稳定输出透明背景，就统一使用 **纯黑 `#000000` 背景**，不要渐变、不要地面、不要边框，方便按颜色通道裁切。

## 全局风格

```text
Original 2D anime game asset for a neon occult action roguelike.
Clean cel-shaded anime rendering, crisp silhouette, luminous magical particles,
dark violet / cyan / gold palette, slight futuristic occult details.
No text, no logo, no watermark, no UI, no frame, no hands, no background scenery.
Single object centered with generous empty margin, readable when scaled to 64–128 px.
Transparent background if supported; otherwise pure black #000000.
```

通用负面词：

```text
text, letters, watermark, signature, UI, frame, border, background scenery, floor,
multiple objects, clutter, photorealistic, 3D render, western cartoon, low contrast,
cropped weapon, cut-off tip, duplicate object, extra hands, extra limbs
```

## 统一裁切规格

| 类别 | 建议生成尺寸 | 最终使用尺寸 | 构图 |
| --- | --- | --- | --- |
| 武器 | 1536×768 或 1024×512 | 512×256 | 水平放置，握柄在左、尖端在右，四周至少 40 px 留白 |
| Q 版角色 | 1024×1024 | 512×512 | 正面或轻微 3/4 视角，全身，脚底距底边约 8% |
| 敌人 | 1024×1024 | 256×256 / 512×512 | 单只居中，轮廓完整，四周至少 60 px 留白 |
| Boss | 1536×1536 | 512×512 或 768×768 | 巨大眼瞳与环形冠冕，注意缩小后仍能读出轮廓 |
| 半身立绘 | 832×1216 | 832×1216 | 胸部以上或半身，人物居中，避免裁断头顶 |

建议文件名：

```text
public/assets/weapons/<character-id>-weapon.png
public/assets/characters/<character-id>-chibi.png
public/assets/portraits/<character-id>-portrait.png
public/assets/enemies/<enemy-code>.png
```

---

## 武器素材

### WPN-01 星轨光剑 / STARLINE_SABER

角色：康丝黛拉  
内部代号：`WPN_STARLINE`  
裁切：512×256，握柄在左，剑尖在右

```text
Original anime game weapon asset: a sleek cyber-magical lightsaber named "Starline Saber".
One long straight energy blade projecting from a compact dark-plum hilt,
thin white-core beam with cyan and violet outer glow, small gold crescent circuit details,
subtle scanline segments inside the blade, elegant high-tech battle suit aesthetic.
Horizontal orientation, handle on the left, blade tip on the right, no character, no hand.
Cel-shaded anime game asset, crisp silhouette, centered, transparent or pure black background.
```

### WPN-02 衡弦双头剑 / EQUILIBRIUM_TWINBLADE

角色：墨筱白  
内部代号：`WPN_TWINBALANCE`  
裁切：512×256，左右两端都必须完整

```text
Original anime game weapon asset: a balanced twin-headed blade named "Equilibrium Twinblade".
One central dark jade-and-gold handle, two opposite energy blades of unequal visible length:
one long gold-white blade, one short rose-gold blade, both with thin calligraphic energy edges.
Ancient Chinese xianxia ornament mixed with clean arcade readability, no character, no hands.
Horizontal orientation, symmetric center, both tips fully visible with margin.
Cel-shaded anime game asset, crisp silhouette, transparent or pure black background.
```

### WPN-03 拂袖符 / SLEEVE_TALISMAN

角色：夜清羽  
内部代号：`WPN_SLEEVE_TALISMAN`  
裁切：512×256，袖口在左，末端灵光在右

```text
Original anime game weapon asset: "Sleeve of Beckoning Talismans".
A long flowing jade-green ceremonial sleeve ribbon ending in a sharp luminous silk tip,
three small floating paper talismans with abstract seal marks orbiting near the end,
subtle frost mist and pale gold particles, zombie-girl occult aesthetic without gore.
Cel-shaded anime game asset, horizontal flowing composition, no character, no hands, no text.
Transparent background if supported; otherwise pure black.
```

### WPN-04 卫星能量球 / SATELLITE_ORB

角色：露可可  
内部代号：`WPN_SATELLITE_ORB`  
裁切：512×512，中心球体与卫星都要完整

```text
Original anime game weapon asset: a witch's "Satellite Energy Orb".
A central dark-violet magical sphere with a bright cyan core, surrounded by three small
floating satellite pearls on thin luminous orbital rings, tiny runes and starry dust.
Elegant, mysterious, readable at small size, no character, no hands, no text.
Centered square composition with generous margin.
Cel-shaded anime game asset, transparent background if supported; otherwise pure black.
```

### WPN-05 针锋刺剑 / NEEDLE_RAPIER

角色：阿罗芒  
内部代号：`WPN_NEEDLE_RAPIER`  
裁切：512×256，握柄在左，极细剑尖在右

```text
Original anime game weapon asset: a needle-thin rapier named "Needlepoint Rapier".
Very long slender silver-white blade, tiny coral-red guard, elegant rose-gold wire ornament
around the grip, a second faint ghost blade silhouette slightly offset for duelist flair.
Horizontal orientation, handle on the left, extremely sharp tip on the right, no character, no hand.
Clean readable silhouette, cel-shaded anime game asset, transparent or pure black background.
```

### WPN-06 霜脊重剑 / FROSTSPINE_GREATSWORD

角色：北堂雪  
内部代号：`WPN_FROSTSPINE`  
裁切：512×256，剑身宽厚但不裁断

```text
Original anime game weapon asset: a giant heavy greatsword named "Frostspine".
Broad ice-steel blade with layered frost ridges, dark navy spine, silver-white edge glow,
small snowflake motifs near the guard, weighty silhouette, elegant rather than brutal.
Horizontal orientation, handle on the left, massive tip on the right, no character, no hand.
Cel-shaded anime game asset, crisp silhouette, transparent or pure black background.
```

---

## 敌人素材与内部命名

### ENM-01 残响灵 / ECHO_WISP

内部代号：`ECHO_WISP`  
游戏内类型：`wisp`  
裁切：512×512

```text
Original anime game enemy asset: "Echo Wisp".
A small floating violet ghost orb with two soft ribbon tails, one glowing cyan eye,
faint crescent-shaped echo rings around its body, ethereal and slightly sorrowful.
Clearly readable as a small 32–64 px enemy, strong silhouette, no gore, no text.
Single centered creature, transparent background or pure black.
```

### ENM-02 裂风猎手 / RIFT_RUNNER

内部代号：`RIFT_RUNNER`  
游戏内类型：`runner`  
裁切：512×512

```text
Original anime game enemy asset: "Rift Runner".
A fast crimson comet-like hunter with a sharp arrow-shaped body, two blade fins,
one narrow cyan eye, trailing rose-red speed streaks behind it.
Aggressive forward-leaning silhouette, readable at 32–64 px, no text, no gore.
Single centered creature, transparent background or pure black.
```

### ENM-03 沉星守卫 / STARFALL_BRUTE

内部代号：`STARFALL_BRUTE`  
游戏内类型：`brute`  
裁切：512×512

```text
Original anime game enemy asset: "Starfall Brute".
A heavy octagonal void-armored guardian made of dark violet stone and star-metal plates,
two small cyan eyes inside a deep central visor, four short gravity spikes, cracked gold runes.
Slow, imposing, compact readable silhouette at 64–96 px, no legs, no gore, no text.
Single centered creature, transparent background or pure black.
```

### ENM-04 斫月女帝 / VOID_EMPRESS

内部代号：`VOID_EMPRESS`  
游戏内类型：`boss`  
裁切：1024×1024

```text
Original anime game boss asset: "Void Empress, the Eye That Cuts the Moon".
A huge floating void-empress mask with one enormous magenta eye, a fractured golden lunar crown,
three overlapping orbital rings, dark violet petals and star fragments, regal and terrifying.
Asymmetric but balanced silhouette, readable at 256–512 px, no text, no gore.
Single centered boss emblem, transparent background or pure black.
```

## 特殊敌人词缀素材

这些敌人当前会复用基础敌人的身体，并叠加一圈词缀色环；正式素材可以让它们拥有独立轮廓。  
如果希望省画稿，也可以只生成“词缀外装/核心”并叠在基础敌人上。

### MOD-01 孵裂囊 / BROOD_SAC

内部代号：`BROOD_SAC`  
词缀：`brood`  
效果：孵化 5 秒内被击杀，会裂出三只小残响灵

```text
Original anime game enemy variant asset: "Brood Sac".
A small floating violet creature with a translucent egg-like abdomen full of three tiny ghost lights,
soft mint-green veins, two thin tendrils, anxious single eye. Clearly readable as a fragile creature
that will split if killed too early. Single centered enemy, no text, no gore.
Transparent background or pure black, 512×512.
```

### MOD-02 殉星炉 / VOLATILE_CORE

内部代号：`VOLATILE_CORE`  
词缀：`volatile`  
效果：高血量，死亡时爆炸并伤害周围

```text
Original anime game enemy variant asset: "Volatile Core".
A heavy dark-violet armored furnace creature with a hot orange star core visible through cracks,
thick plated shell, two tiny warning-eye lights, heat distortion ring, obvious explosive silhouette.
Single centered enemy, no text, no gore, 512×512, transparent or pure black background.
```

### MOD-03 裂甲兽 / SLASH_REND

内部代号：`SLASH_REND`  
词缀：`slash_weak`  
效果：更吃斩击伤害，刺击伤害较低

```text
Original anime game enemy variant asset: "Slash Rend".
A compact star-metal beast with layered horizontal armor plates that look designed to be cut,
wide crescent-shaped body, cyan glowing seams, no shields on the flanks.
Strong silhouette, clearly vulnerable to horizontal cutting, single centered enemy,
no text, no gore, transparent or pure black background.
```

### MOD-04 针孔骑士 / THRUST_VENT

内部代号：`THRUST_VENT`  
词缀：`thrust_weak`  
效果：更吃刺击伤害，斩击伤害较低

```text
Original anime game enemy variant asset: "Thrust Vent".
A narrow armored knight-like orb with one exposed circular vent in the center,
pale orange inner glow, needle-shaped armor fins pointed outward, small cyan eye.
Clearly reads as a target for precise piercing attacks, single centered enemy,
no text, no gore, transparent or pure black background.
```

### MOD-05 凝锋水母 / BLADE_TAR

内部代号：`BLADE_TAR`  
词缀：`blade_slow`  
效果：武器经过时使转向速度短暂降低

```text
Original anime game enemy variant asset: "Blade Tar".
A translucent deep-cyan jellyfish-like void creature with sticky gravity threads hanging below,
soft white core, faint blade-shaped trails caught inside its body, calm single eye.
Clearly magical and slowing, single centered enemy, no text, no gore,
transparent or pure black background.
```

### MOD-06 半壁卫 / SIDE_BULWARK

内部代号：`SIDE_BULWARK`  
词缀：`side_armor`  
效果：一侧有盾，正面减伤，另一侧受伤大幅提高

```text
Original anime game enemy variant asset: "Side Bulwark".
A circular void guardian with a large curved silver-violet tower shield covering exactly one side,
visible armored weak point on the opposite side, two small eyes behind the shield slit.
Asymmetric silhouette, very clear which side is guarded, single centered enemy,
no text, no gore, transparent or pure black background.
```

---

## Q 版角色素材

建议先做六张独立图，统一比例与脚底基线，后续再拼成图集。  
角色气质可以用颜色和轮廓区分，脸部和服装细节先保持简单。

### CHIBI-01 康丝黛拉

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Cute cyber battle-suit girl inspired by a magical girl, short dark-plum hair with cyan circuit clips,
slim dark bodysuit with glowing cyan seams, tiny crescent emblem, confident friendly expression.
2.2-head-tall chibi proportions, large expressive eyes, clean thick outline, readable at 96 px.
No weapon, no hands overlapping body, no text, transparent or pure black background.
```

### CHIBI-02 墨筱白

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Ancient Chinese swordswoman with long black hair, gold hairpin, white-and-jade layered hanfu,
rose-gold sash, calm confident expression, slight martial-arts stance.
2.2-head-tall chibi proportions, clean silhouette, no weapon, no text,
transparent or pure black background.
```

### CHIBI-03 夜清羽

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Cute zombie girl with pale mint skin, long dark teal hair, small paper talisman on her cheek,
layered jade-green and black ritual robe, frost particles, sleepy gentle expression.
Non-gory, charming, 2.2-head-tall chibi proportions, no weapon, no text,
transparent or pure black background.
```

### CHIBI-04 露可可

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Small witch girl with wavy lavender hair, oversized dark witch hat with cyan star charm,
black-violet dress, tiny satellite pearls orbiting around her, curious smile.
2.2-head-tall chibi proportions, clean silhouette, no staff, no text,
transparent or pure black background.
```

### CHIBI-05 阿罗芒

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Elegant rapier duelist girl with coral-red short hair, cream and charcoal fencing-inspired dress,
rose-gold ribbons, confident smirk, one hand near hip, no weapon.
2.2-head-tall chibi proportions, clean silhouette, no text, transparent or pure black background.
```

### CHIBI-06 北堂雪

```text
Original chibi anime game character, full body, neutral standing pose, three-quarter front view.
Calm heavy-sword girl with long ice-blue hair, white fur collar, dark navy and silver outfit,
snowflake hair ornament, composed expression, sturdy silhouette.
2.2-head-tall chibi proportions, no weapon, no text, transparent or pure black background.
```

---

## 半身立绘占位替换

角色选择页与特殊强化卡会优先使用半身立绘。建议每位角色生成一张竖图，背景保持深色但不要复杂场景。

通用构图提示：

```text
Original anime game character portrait, half body, three-quarter view, centered,
clean cel-shaded rendering, luminous rim light, dark violet occult background with subtle stars,
strong readable face and costume silhouette, no text, no UI, no weapon overlap.
```

每位角色在通用构图后追加：

- 康丝黛拉：cyber battle-suit magical girl, cyan circuit seams, plum hair, confident gaze.
- 墨筱白：xianxia swordswoman, white-jade hanfu, gold hairpin, calm martial grace.
- 夜清羽：pale zombie girl, jade ritual robe, paper talisman, frost and gentle melancholy.
- 露可可：lavender witch, oversized hat, satellite pearls, curious smile.
- 阿罗芒：coral-haired rapier duelist, fencing dress, rose-gold ribbons, confident smirk.
- 北堂雪：ice-blue heavy-sword girl, white fur collar, snow motifs, composed gaze.

## 生成与裁切流程

1. 先生成武器和敌人：这些是缩小后最影响可读性的素材。
2. 每张只放一个主体，不要生成拼图或带边框的卡片。
3. 若背景是纯黑，裁切时按 alpha 或黑色通道生成透明 PNG，再保留 20–40 px 内边距。
4. 武器统一保持“握柄左、尖端右”，接入游戏后直接旋转即可。
5. Q 版角色统一脚底基线，后续我会按同一缩放比例替换当前占位小人。
6. Boss 与卫星球优先保证小尺寸轮廓，不要依赖内部细纹辨认。
