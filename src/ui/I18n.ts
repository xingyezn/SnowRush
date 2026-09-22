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
    'hud.hint': 'W 加速 · A / D 转向 · S 刹车 · R 重置',

    'message.crashed': '摔车了',
    'message.checkpoint': '检查点',
    'message.go': '出发！',

    'trick.combo': '连击',
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
    'hud.hint': 'W accelerate · A / D turn · S brake · R reset',

    'message.crashed': 'CRASHED',
    'message.checkpoint': 'CHECKPOINT',
    'message.go': 'GO!',

    'trick.combo': 'COMBO',
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
