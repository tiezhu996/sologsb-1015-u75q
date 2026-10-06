export type Tone = '平' | '仄' | '中' | '?';
export type MarkTone = '平' | '仄' | '中';

/** 字位音义裁断状态：已定 / 待核（选词未补词证，或前后文核对未过） */
export type AdjudicationStatus = 'confirmed' | 'pending';

/** 字典中一个多音字音义候选 */
export interface ReadingEntry {
  /** 拼音（含声调），如 kàn */
  pinyin: string;
  /** 该读音的平仄 */
  tone: MarkTone;
  /** 释义或词性，如“观看、察看” */
  gloss: string;
  /** 例词，如“看山” */
  example?: string;
  /** 韵书出处，如“去声二十八勘” */
  rhyme?: string;
}

/** 多音字候选音义表条目 */
export interface PolyphoneEntry {
  char: string;
  /** 字典默认读音（缺省平仄取此音） */
  defaultPinyin: string;
  readings: ReadingEntry[];
}

/**
 * 字位级音义裁断。裁断只挂在当前字位（行:位），
 * 同一个字在别处以各自字位记录为准，一处裁定不牵动全篇。
 */
export interface Adjudication {
  char: string;
  pinyin: string;
  gloss: string;
  /** 校勘员写下的邻字 / 词证 */
  evidence: string;
  status: AdjudicationStatus;
  /** 进入待核的原因（词证不足或前后文核对未过） */
  reviewReason?: string;
  /** 裁定时的前后文快照，供增删字、换模板后复核 */
  contextLine: string;
  position: number;
  updatedAt: string;
}

export interface CharacterMark {
  tone: MarkTone | '?';
  rhyme: string;
  pauseAfter: boolean;
  basis: string;
  note: string;
  /** 字位音义裁断（仅多音字可有）；未裁断沿用字典值 */
  adjudication?: Adjudication;
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
  status: 'correct' | 'variant' | 'error' | 'unknown' | 'neutral' | 'review';
  message: string;
  mark: CharacterMark;
  /** 是否为多音字（字典存在多个音义候选） */
  polyphone: boolean;
  /** 裁断状态：无裁断 / 已定 / 待核 */
  adjudicationState: 'none' | 'confirmed' | 'pending';
  /** 待核原因（未裁断多音字或裁断未获词证支持） */
  reviewReason?: string;
}

export interface AnalysisLine {
  index: number;
  cells: AnalysisCell[];
  rhymeChars: string[];
  errors: number;
  variants: number;
  reviews: number;
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
