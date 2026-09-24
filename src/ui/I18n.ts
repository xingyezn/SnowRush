export type Language = 'zh' | 'en';

const STORAGE_KEY = 'SnowRush.language';

type Dictionary = Record<string, string>;

const MESSAGES: Record<Language, Dictionary> = {
  zh: {
    'menu.subtitle': '低多边形单板滑雪',
    'menu.rider': '角色',
    'menu.preview': '角色预览',
    'menu.play': '开始游戏',
    'menu.best': '最高分',
    'menu.lang': 'EN',

    'controls.accelerate': '加速',
    'controls.turn': '转向',
    'controls.brake': '刹车',
    'controls.jump': '跳跃',
    'controls.flip': '前后空翻',
    'controls.spin': '转体',
    'controls.reset': '重置',
    'controls.pause': '暂停',

    'key.accel': 'W / ↑',
    'key.turn': 'A / D',
    'key.brake': 'S / ↓',
    'key.jump': 'SPACE',
    'key.airFlip': '空中 W / S',
    'key.airSpin': '空中 A / D',
    'key.reset': 'R',
    'key.pause': 'P / ESC',

    'pause.title': '已暂停',
    'pause.resume': '继续',
    'pause.restart': '重新开始',
    'crash.title': '摔车了！',
    'crash.respawn': '回到存档点',

    'result.title': '本次滑行结束',
    'result.time': '用时',
    'result.score': '分数',
    'result.speed': '最高速度',
    'result.gates': '旗门',
    'result.tricks': '特技',
    'result.combo': '最高连击',
    'result.again': '再来一局',

    'hud.score': '分数',
    'hud.time': '时间',
    'hud.hint': 'W 加速 · A / D 转向 · S 刹车 · R 重置 · V 视角 · K 拍照',

    'message.crashed': '摔车了',
    'message.checkpoint': '存档点',
    'message.go': '出发！',
    'message.muted': '已静音',
    'message.unmuted': '声音已开启',

    'trick.combo': '连击',

    'menu.start': '开始游戏',
    'menu.characters': '角色',
    'menu.howto': '玩法说明',
    'menu.settings': '设置',
    'menu.credits': '制作人员',
    'menu.back': '返回',
    'menu.next': '下一步',

    'howto.title': '玩法说明',
    'howto.goal':
      '从山顶一路滑到终点：躲避树木与岩石，穿过旗门与存档点，利用跳台完成空中特技。落地越稳、连招越多，分数越高。',

    'credits.title': '制作人员',
    'credits.dev': '开发 / 设计',
    'credits.devValue': 'xingyezn',
    'credits.models': '模型素材',
    'credits.modelsValue': 'Quaternius (CC0) · Kenney (CC0) · 玩家提供',
    'credits.tech': '技术',
    'credits.techValue': 'Vite · TypeScript · Three.js · Rapier',

    'settings.title': '设置',
    'settings.language': '语言',
    'settings.volume': '主音量',
    'settings.music': '音乐音量',
    'settings.sfx': '音效音量',
    'settings.mute': '静音',
    'settings.shadows': '阴影',
    'settings.tutorial': '教学提示',
    'settings.quality': '画质',
    'settings.fps': '帧率显示',
    'settings.view': '视角',
    'settings.on': '开',
    'settings.off': '关',

    'pause.settings': '设置',
    'pause.quit': '返回主菜单',

    'result.newbest': '新纪录！',
    'result.rank': '评级',

    'tip.1': '提示：空中按 W / S 可以前后空翻。',
    'tip.2': '提示：落地角度越小越稳，摔车会清空连击。',
    'tip.3': '提示：穿过旗门可以额外加分。',
    'tip.4': '提示：速度越快，镜头越远、视角越广。',

    'menu.records': '记录',
    'menu.achievements': '成就',
    'records.runs': '总场次',
    'records.bestScore': '最高分',
    'records.bestTime': '最快用时',
    'records.bestSpeed': '最高速度',
    'records.bestCombo': '最高连击',
    'records.tricks': '累计特技',
    'records.gates': '累计旗门',
    'records.crashes': '累计摔车',
    'records.time': '累计用时',
    'achievements.locked': '未解锁',

    'ach.first-run.name': '初次登场',
    'ach.first-run.desc': '完成第一局滑行',
    'ach.clean-run.name': '零失误',
    'ach.clean-run.desc': '全程不摔车完成一次',
    'ach.combo-3.name': '连击达人',
    'ach.combo-3.desc': '达成 ×3 连击',
    'ach.speed-100.name': '风驰电掣',
    'ach.speed-100.desc': '最高速度达到 100 km/h',
    'ach.score-5000.name': '高分滑手',
    'ach.score-5000.desc': '单局得分达到 5000',
    'ach.score-10000.name': '滑雪大师',
    'ach.score-10000.desc': '单局得分达到 10000',
    'ach.trick-8.name': '特技演员',
    'ach.trick-8.desc': '单局完成 8 个特技',
    'ach.all-gates.name': '旗门全通',
    'ach.all-gates.desc': '单局穿过全部旗门',
    'ach.combo-5.name': '连击大师',
    'ach.combo-5.desc': '达成 ×5 连击',
    'ach.speed-130.name': '极速狂飙',
    'ach.speed-130.desc': '最高速度达到 130 km/h',
    'ach.air-2s.name': '滞空高手',
    'ach.air-2s.desc': '单次腾空超过 2 秒',

    'quality.auto': '自动',
    'quality.high': '高',
    'quality.low': '低',

    'view.third': '第三人称',
    'view.first': '第一人称',
    'message.firstPerson': '第一人称视角',
    'message.thirdPerson': '第三人称视角',

    'character.runer.desc': '黄色雪服的滑手',
    'character.panda.desc': '熊猫造型滑手',

    'settings.reset': '清除记录',
    'result.achievements': '解锁成就',

    'menu.mode': '模式',
    'mode.standard': '标准',
    'mode.time': '计时挑战',
    'mode.oneline': '一命通关',
    'mode.endless': '无尽模式',
    'mode.standard.desc': '标准规则：摔车后回到最近存档点。',
    'mode.time.desc': '在限定时间内冲过终点。',
    'mode.oneline.desc': '一次摔车即结束本局。',
    'mode.endless.desc': '超长随机赛道，没有终点，尽情滑行。',

    'menu.track': '赛道',
    'track.standard': '标准赛道',
    'track.random': '随机赛道',
    'track.standard.desc': '固定的 7 段赛道。',
    'track.random.desc': '每局随机生成地形与布局。',

    'item.boost': '加速',
    'item.score': '加分',
    'item.shield': '护盾',
    'item.magnet': '磁铁',
    'item.slowmo': '滞空',
    'item.invincible': '无敌',
    'item.pickup': '获得',

    'daily.title': '每日挑战',
    'daily.kind.score': '单局得分',
    'daily.kind.gates': '穿过旗门',
    'daily.kind.tricks': '完成特技',
    'daily.kind.speed': '最高速度',
    'daily.kind.time': '通关用时(秒)',
    'daily.kind.air': '滞空(秒)',

    'photo.hint': '拖动旋转 · 滚轮缩放 · K / Esc 退出',
    'photo.save': '保存截图',
    'photo.exit': '退出',
    'photo.saved': '已保存截图',

    'touch.notice': '检测到触屏设备，建议使用桌面浏览器 + 键盘游玩',
    'tutorial.skip': '跳过',
    'tutorial.move': '按住 W 加速下滑',
    'tutorial.turn': '用 A / D 左右转向',
    'tutorial.jump': '按 SPACE 起跳',
    'tutorial.gate': '穿过旗门可以获得额外分数',
    'tutorial.go': '干得漂亮，祝你好运！',
  },
  en: {
    'menu.subtitle': 'LOW-POLY SNOWBOARDING',
    'menu.rider': 'RIDER',
    'menu.preview': 'RIDER PREVIEW',
    'menu.play': 'PLAY',
    'menu.best': 'BEST',
    'menu.lang': '中文',

    'controls.accelerate': 'Accelerate',
    'controls.turn': 'Turn',
    'controls.brake': 'Brake',
    'controls.jump': 'Jump',
    'controls.flip': 'Flip',
    'controls.spin': 'Spin',
    'controls.reset': 'Reset',
    'controls.pause': 'Pause',

    'key.accel': 'W / ↑',
    'key.turn': 'A / D',
    'key.brake': 'S / ↓',
    'key.jump': 'SPACE',
    'key.airFlip': 'AIR W / S',
    'key.airSpin': 'AIR A / D',
    'key.reset': 'R',
    'key.pause': 'P / ESC',

    'pause.title': 'PAUSED',
    'pause.resume': 'RESUME',
    'pause.restart': 'RESTART',
    'crash.title': 'CRASHED!',
    'crash.respawn': 'RETRY CHECKPOINT',

    'result.title': 'RUN COMPLETE',
    'result.time': 'TIME',
    'result.score': 'SCORE',
    'result.speed': 'MAX SPEED',
    'result.gates': 'GATES',
    'result.tricks': 'TRICKS',
    'result.combo': 'MAX COMBO',
    'result.again': 'PLAY AGAIN',

    'hud.score': 'SCORE',
    'hud.time': 'TIME',
    'hud.hint': 'W accelerate · A / D turn · S brake · R reset · V view · K photo',

    'message.crashed': 'CRASHED',
    'message.checkpoint': 'CHECKPOINT',
    'message.go': 'GO!',
    'message.muted': 'MUTED',
    'message.unmuted': 'SOUND ON',

    'trick.combo': 'COMBO',

    'menu.start': 'START',
    'menu.characters': 'CHARACTERS',
    'menu.howto': 'HOW TO PLAY',
    'menu.settings': 'SETTINGS',
    'menu.credits': 'CREDITS',
    'menu.back': 'BACK',
    'menu.next': 'NEXT',

    'howto.title': 'HOW TO PLAY',
    'howto.goal':
      'Ride from the summit to the finish: dodge trees and rocks, pass gates and checkpoints, and use the kickers for air tricks. Cleaner landings and longer combos score more.',

    'credits.title': 'CREDITS',
    'credits.dev': 'Development / Design',
    'credits.devValue': 'xingyezn',
    'credits.models': 'Model assets',
    'credits.modelsValue': 'Quaternius (CC0) · Kenney (CC0) · player-provided',
    'credits.tech': 'Technology',
    'credits.techValue': 'Vite · TypeScript · Three.js · Rapier',

    'settings.title': 'SETTINGS',
    'settings.language': 'Language',
    'settings.volume': 'Master volume',
    'settings.music': 'Music volume',
    'settings.sfx': 'SFX volume',
    'settings.mute': 'Mute',
    'settings.shadows': 'Shadows',
    'settings.tutorial': 'Tutorial tips',
    'settings.quality': 'Quality',
    'settings.fps': 'FPS counter',
    'settings.view': 'View',
    'settings.on': 'On',
    'settings.off': 'Off',

    'pause.settings': 'SETTINGS',
    'pause.quit': 'MAIN MENU',

    'result.newbest': 'NEW BEST!',
    'result.rank': 'RANK',

    'tip.1': 'Tip: press W / S in the air to front / backflip.',
    'tip.2': 'Tip: land flat — crashing resets your combo.',
    'tip.3': 'Tip: passing gates grants bonus score.',
    'tip.4': 'Tip: the faster you go, the wider the camera pulls back.',

    'menu.records': 'RECORDS',
    'menu.achievements': 'ACHIEVEMENTS',
    'records.runs': 'Runs',
    'records.bestScore': 'Best score',
    'records.bestTime': 'Best time',
    'records.bestSpeed': 'Top speed',
    'records.bestCombo': 'Best combo',
    'records.tricks': 'Total tricks',
    'records.gates': 'Total gates',
    'records.crashes': 'Total crashes',
    'records.time': 'Total time',
    'achievements.locked': 'Locked',

    'ach.first-run.name': 'First Ride',
    'ach.first-run.desc': 'Finish your first run',
    'ach.clean-run.name': 'Clean Run',
    'ach.clean-run.desc': 'Finish a run without crashing',
    'ach.combo-3.name': 'Combo Master',
    'ach.combo-3.desc': 'Reach a ×3 combo',
    'ach.speed-100.name': 'Speed Demon',
    'ach.speed-100.desc': 'Reach 100 km/h',
    'ach.score-5000.name': 'High Scorer',
    'ach.score-5000.desc': 'Score 5000 in one run',
    'ach.score-10000.name': 'Snow Legend',
    'ach.score-10000.desc': 'Score 10000 in one run',
    'ach.trick-8.name': 'Trickster',
    'ach.trick-8.desc': 'Land 8 tricks in one run',
    'ach.all-gates.name': 'Gate Sweeper',
    'ach.all-gates.desc': 'Pass every gate in one run',
    'ach.combo-5.name': 'Combo Legend',
    'ach.combo-5.desc': 'Reach a ×5 combo',
    'ach.speed-130.name': 'Top Speed',
    'ach.speed-130.desc': 'Reach 130 km/h',
    'ach.air-2s.name': 'Big Air',
    'ach.air-2s.desc': 'Stay airborne for over 2 seconds',

    'quality.auto': 'Auto',
    'quality.high': 'High',
    'quality.low': 'Low',

    'view.third': 'Third',
    'view.first': 'First',
    'message.firstPerson': 'First-person',
    'message.thirdPerson': 'Third-person',

    'character.runer.desc': 'Rider in a yellow jacket',
    'character.panda.desc': 'Panda snowboarder',

    'settings.reset': 'Reset records',
    'result.achievements': 'ACHIEVEMENTS UNLOCKED',

    'menu.mode': 'MODE',
    'mode.standard': 'Standard',
    'mode.time': 'Time Attack',
    'mode.oneline': 'One Life',
    'mode.endless': 'Endless',
    'mode.standard.desc': 'Standard rules: crashing returns you to the last checkpoint.',
    'mode.time.desc': 'Reach the finish before the time runs out.',
    'mode.oneline.desc': 'A single crash ends the run.',
    'mode.endless.desc': 'A very long random descent with no finish line.',

    'menu.track': 'TRACK',
    'track.standard': 'Standard',
    'track.random': 'Random',
    'track.standard.desc': 'The fixed 7-section course.',
    'track.random.desc': 'A fresh random layout every run.',

    'item.boost': 'Boost',
    'item.score': 'Score',
    'item.shield': 'Shield',
    'item.magnet': 'Magnet',
    'item.slowmo': 'Slow-mo',
    'item.invincible': 'Invincible',
    'item.pickup': 'Got',

    'daily.title': 'Daily Challenge',
    'daily.kind.score': 'Score in one run',
    'daily.kind.gates': 'Pass gates',
    'daily.kind.tricks': 'Land tricks',
    'daily.kind.speed': 'Top speed',
    'daily.kind.time': 'Finish time (s)',
    'daily.kind.air': 'Air time (s)',

    'photo.hint': 'Drag to orbit · wheel to zoom · K / Esc to exit',
    'photo.save': 'Save photo',
    'photo.exit': 'Exit',
    'photo.saved': 'Photo saved',

    'touch.notice': 'Touch device detected — a desktop browser with a keyboard is recommended',
    'tutorial.skip': 'SKIP',
    'tutorial.move': 'Hold W to accelerate',
    'tutorial.turn': 'Steer with A / D',
    'tutorial.jump': 'Press SPACE to jump',
    'tutorial.gate': 'Pass gates for bonus score',
    'tutorial.go': 'Nice — good luck!',
  },
};

/** Key order used by the menus' control hint grid. */
export const CONTROL_ROWS: ReadonlyArray<[string, string]> = [
  ['key.accel', 'controls.accelerate'],
  ['key.turn', 'controls.turn'],
  ['key.brake', 'controls.brake'],
  ['key.jump', 'controls.jump'],
  ['key.airFlip', 'controls.flip'],
  ['key.airSpin', 'controls.spin'],
  ['key.reset', 'controls.reset'],
  ['key.pause', 'controls.pause'],
];

function loadLanguage(): Language {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
  } catch {
    // localStorage can be unavailable (private mode); ignore.
  }
  return 'zh';
}

let language: Language = loadLanguage();
const listeners = new Set<() => void>();

export function getLanguage(): Language {
  return language;
}

export function t(key: string): string {
  return MESSAGES[language][key] ?? MESSAGES.en[key] ?? key;
}

export function setLanguage(next: Language): void {
  if (next === language) return;
  language = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // ignore
  }
  for (const listener of listeners) listener();
}

export function toggleLanguage(): void {
  setLanguage(language === 'zh' ? 'en' : 'zh');
}

export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
