export type Tone = '平' | '仄' | '中' | '?';
export type MarkTone = '平' | '仄' | '中';

/** 多音字的一个候选音义 */
export interface ReadingOption {
  id: string;
  pinyin: string;
  tone: MarkTone;
  sense: string;
  examples: string[];
}

/** 多音字字典条目 */
export interface PolyphoneEntry {
  char: string;
  defaultReadingId: string;
  readings: ReadingOption[];
}

export type AdjudicationStatus = 'confirmed' | 'pending';

/**
 * 字位音义裁断：只隶属某一句某一字位（marks 的 line:position 键），
 * 不影响同一个字在其他字位的判断。
 */
export interface ReadingAdjudication {
  char: string;
  readingId: string;
  pinyin: string;
  tone: MarkTone;
  sense: string;
  /** 支撑裁断的邻字或词证，须能在本句前后文中核对 */
  witness: string;
  /** confirmed=已裁定；pending=待核（无词证或正文改动后核对不上被退回） */
  status: AdjudicationStatus;
  /** 退回待核时的说明 */
  reason: string;
  updatedAt: string;
}

export interface CharacterMark {
  tone: MarkTone | '?';
  rhyme: string;
  pauseAfter: boolean;
  basis: string;
  note: string;
  adjudication?: ReadingAdjudication;
}

export interface PoemVersion {
  id: string;
  name: string;
  source: string;
  createdAt: string;
  text: string;
  marks: Record<string, CharacterMark>;
  antithesisPairs: AntithesisPair[];
}

export interface AntithesisPair {
  id: string;
  leftLine: number;
  rightLine: number;
  note: string;
}

export interface PoemWorkspace {
  title: string;
  author: string;
  templateId: string;
  versions: PoemVersion[];
  activeVersionId: string;
  updatedAt: string;
}

export interface MeterTemplate {
  id: string;
  name: string;
  summary: string;
  lineCount: number;
  lineLength: number;
  pattern: Tone[];
  rhymeLines: number[];
}

export interface AnalysisCell {
  char: string;
  position: number;
  expected: Tone;
  actual: Tone;
  /** 平仄来源：裁定音义 / 手工标注 / 字典缺省 / 未知 */
  toneSource: 'adjudication' | 'manual' | 'dictionary' | 'unknown';
  /** 多音字且尚未形成可靠裁断，平仄沿字典缺省、不能进入出律结论 */
  pendingReview: boolean;
  polyphone?: PolyphoneEntry;
  adjudication?: ReadingAdjudication;
  status: 'correct' | 'variant' | 'error' | 'unknown' | 'neutral';
  message: string;
  mark: CharacterMark;
}

export interface AnalysisLine {
  index: number;
  cells: AnalysisCell[];
  rhymeChars: string[];
  errors: number;
  variants: number;
  pending: number;
}

export interface PoemIssue {
  id: string;
  level: 'error' | 'warning' | 'info';
  title: string;
  detail: string;
  line?: number;
  position?: number;
}

export interface CharDiff {
  index: number;
  left: string;
  right: string;
  changed: boolean;
}
