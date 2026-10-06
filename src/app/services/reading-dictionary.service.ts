import { Injectable } from '@angular/core';
import type { Adjudication, MarkTone, PolyphoneEntry, ReadingEntry } from '../models/poem.models';

const PUNCTUATION = new Set(['，', '。', '！', '？', '；', '：', '、', ' ', '\t', ',', '.', '!', '?', ';', ':', '—', '～', '~']);

/**
 * 多音字音义候选表。
 * 仅收录两读且平仄或词性有别的常用字；字典值只作缺省，字位裁断优先于字典。
 */
const POLYPHONES: PolyphoneEntry[] = [
  {
    char: '看',
    defaultPinyin: 'kàn',
    readings: [
      { pinyin: 'kàn', tone: '仄', gloss: '观看、察看、看望', example: '看竹、遥看', rhyme: '去声二十八勘' },
      { pinyin: 'kān', tone: '平', gloss: '看守、守护', example: '看门、看护', rhyme: '平声十四寒' },
    ],
  },
  {
    char: '行',
    defaultPinyin: 'xíng',
    readings: [
      { pinyin: 'xíng', tone: '平', gloss: '行走、行进、施行', example: '行人、行路', rhyme: '平声八庚' },
      { pinyin: 'háng', tone: '平', gloss: '行列、行伍、辈分', example: '一行、行阵', rhyme: '平声七阳' },
    ],
  },
  {
    char: '重',
    defaultPinyin: 'zhòng',
    readings: [
      { pinyin: 'zhòng', tone: '仄', gloss: '分量大、厚重、重视', example: '轻重、九重', rhyme: '去声二宋' },
      { pinyin: 'chóng', tone: '平', gloss: '重复、重新、层', example: '重阳、千里重重', rhyme: '平声二冬' },
    ],
  },
  {
    char: '教',
    defaultPinyin: 'jiào',
    readings: [
      { pinyin: 'jiào', tone: '仄', gloss: '教化、教育、宗教', example: '教化、教义', rhyme: '去声十九效' },
      { pinyin: 'jiāo', tone: '平', gloss: '使、令（使役）', example: '教愁、不教人见', rhyme: '平声三肴' },
    ],
  },
  {
    char: '思',
    defaultPinyin: 'sī',
    readings: [
      { pinyin: 'sī', tone: '平', gloss: '思虑、思念（动词）', example: '相思、思归', rhyme: '平声四支' },
      { pinyin: 'sì', tone: '仄', gloss: '思绪、愁思（名词）', example: '秋思、旅思', rhyme: '去声四寘' },
    ],
  },
  {
    char: '长',
    defaultPinyin: 'cháng',
    readings: [
      { pinyin: 'cháng', tone: '平', gloss: '长短、长久、远', example: '长江、长夜', rhyme: '平声七阳' },
      { pinyin: 'zhǎng', tone: '仄', gloss: '成长、长幼、首领', example: '长者、生长', rhyme: '上声二十二养' },
    ],
  },
  {
    char: '更',
    defaultPinyin: 'gèng',
    readings: [
      { pinyin: 'gèng', tone: '仄', gloss: '更加、再、复', example: '更好、更上', rhyme: '去声二十四敬' },
      { pinyin: 'gēng', tone: '平', gloss: '改易、更换、夜半更', example: '三更、更衣', rhyme: '平声八庚' },
    ],
  },
  {
    char: '中',
    defaultPinyin: 'zhōng',
    readings: [
      { pinyin: 'zhōng', tone: '平', gloss: '中间、内里（方位名词）', example: '中流、城中', rhyme: '平声一东' },
      { pinyin: 'zhòng', tone: '仄', gloss: '命中、切中、遭受', example: '中第、中酒', rhyme: '去声一送' },
    ],
  },
  {
    char: '难',
    defaultPinyin: 'nán',
    readings: [
      { pinyin: 'nán', tone: '平', gloss: '艰难、不易（形容词）', example: '艰难、难处', rhyme: '平声十四寒' },
      { pinyin: 'nàn', tone: '仄', gloss: '患难、危难、驳诘', example: '逃难、责难', rhyme: '去声十五翰' },
    ],
  },
  {
    char: '量',
    defaultPinyin: 'liàng',
    readings: [
      { pinyin: 'liàng', tone: '仄', gloss: '气量、容量、数量（名词）', example: '气量、酒量', rhyme: '去声二十三漾' },
      { pinyin: 'liáng', tone: '平', gloss: '称量、衡量（动词）', example: '量水、斗量', rhyme: '平声七阳' },
    ],
  },
  {
    char: '吹',
    defaultPinyin: 'chuī',
    readings: [
      { pinyin: 'chuī', tone: '平', gloss: '吹气、吹奏（动词）', example: '吹风、吹笛', rhyme: '平声四支' },
      { pinyin: 'chuì', tone: '仄', gloss: '吹奏之乐、管乐（名词）', example: '鼓吹', rhyme: '去声四寘' },
    ],
  },
  {
    char: '骑',
    defaultPinyin: 'qí',
    readings: [
      { pinyin: 'qí', tone: '平', gloss: '跨马、骑乘（动词）', example: '骑马、骑驴', rhyme: '平声四支' },
      { pinyin: 'jì', tone: '仄', gloss: '坐骑、骑兵（名词）', example: '车骑、一骑', rhyme: '去声四寘' },
    ],
  },
  {
    char: '兴',
    defaultPinyin: 'xìng',
    readings: [
      { pinyin: 'xìng', tone: '仄', gloss: '兴致、兴会、比兴（名词）', example: '秋兴、乘兴', rhyme: '去声二十五径' },
      { pinyin: 'xīng', tone: '平', gloss: '兴起、兴盛（动词）', example: '兴怀、盛衰兴', rhyme: '平声十蒸' },
    ],
  },
  {
    char: '令',
    defaultPinyin: 'lìng',
    readings: [
      { pinyin: 'lìng', tone: '仄', gloss: '命令、使令、县令', example: '军令、令人', rhyme: '去声二十四敬' },
      { pinyin: 'líng', tone: '平', gloss: '复姓“令”；令狐', example: '令狐', rhyme: '平声八庚' },
    ],
  },
  {
    char: '浪',
    defaultPinyin: 'làng',
    readings: [
      { pinyin: 'làng', tone: '仄', gloss: '波浪、浪游', example: '波浪、沧浪外', rhyme: '去声二十三宕' },
      { pinyin: 'láng', tone: '平', gloss: '沧浪（水名叠用）', example: '沧浪', rhyme: '平声七阳' },
    ],
  },
  {
    char: '华',
    defaultPinyin: 'huá',
    readings: [
      { pinyin: 'huá', tone: '平', gloss: '光华、繁华、华夏', example: '华灯、中华', rhyme: '平声六麻' },
      { pinyin: 'huà', tone: '仄', gloss: '华山、华姓', example: '华山、太华', rhyme: '去声二十二禡' },
    ],
  },
];

const POLYPHONE_MAP = new Map<string, PolyphoneEntry>(POLYPHONES.map((entry) => [entry.char, entry]));

/** 从一句正文中剔除标点，保留字序 */
export function stripPunctuation(line: string): string {
  return Array.from(line).filter((char) => !PUNCTUATION.has(char)).join('');
}

/** 取出词证中的汉字片段（至少一个汉字才算有效片段） */
function evidenceTokens(evidence: string): string[] {
  return (evidence.match(/[一-鿿]{1,}/g) ?? []).map((token) => token.trim()).filter(Boolean);
}

/**
 * 词证是否能支撑本字位：
 * - 双字及以上词证必须作为邻字片段出现在当前句中（邻字 / 词证）；
 * - 单字参照须落在本字 ±3 字邻域内，且不能只写被证字本身；
 * - 没有可落到当前句的词证，一律不算数。
 */
export function evidenceSupports(char: string, position: number, rawLine: string, evidence: string): boolean {
  const line = stripPunctuation(rawLine);
  if (!line) return false;
  const tokens = evidenceTokens(evidence);
  if (tokens.length === 0) return false;
  return tokens.some((token) => {
    if (token.length >= 2) {
      return line.includes(token);
    }
    if (token === char) return false;
    const index = line.indexOf(token);
    return index >= 0 && Math.abs(index - position) <= 3;
  });
}

export interface AdjudicationEvaluation {
  status: Adjudication['status'];
  reviewReason?: string;
}

/**
 * 按新的前后文核对一条裁断：
 * 字位换字、词证对不上，均退回待核；词证重新对上则恢复已定。
 */
export function evaluateAdjudication(
  adjudication: Adjudication,
  char: string,
  position: number,
  rawLine: string,
): AdjudicationEvaluation {
  if (adjudication.char !== char) {
    return { status: 'pending', reviewReason: '正文已改字，原裁定音义不再对应当前字位' };
  }
  if (adjudication.position !== position) {
    return { status: 'pending', reviewReason: '正文增删字后字位已移动，需按新前后文重核' };
  }
  if (!adjudication.evidence.trim()) {
    return { status: 'pending', reviewReason: '已选音义但缺少邻字或词证，暂留待核' };
  }
  if (!evidenceSupports(char, position, rawLine, adjudication.evidence)) {
    return { status: 'pending', reviewReason: '词证与当前前后文对不上，退回待定' };
  }
  return { status: 'confirmed' };
}

@Injectable({ providedIn: 'root' })
export class ReadingDictionaryService {
  getPolyphone(char: string): PolyphoneEntry | undefined {
    return POLYPHONE_MAP.get(char);
  }

  isPolyphone(char: string): boolean {
    return POLYPHONE_MAP.has(char);
  }

  readingsOf(char: string): ReadingEntry[] {
    return POLYPHONE_MAP.get(char)?.readings ?? [];
  }

  /** 字典默认读音的平仄（缺省值） */
  defaultTone(char: string): MarkTone | undefined {
    const entry = POLYPHONE_MAP.get(char);
    if (!entry) return undefined;
    return entry.readings.find((reading) => reading.pinyin === entry.defaultPinyin)?.tone;
  }

  findReading(char: string, pinyin: string): ReadingEntry | undefined {
    return this.readingsOf(char).find((reading) => reading.pinyin === pinyin);
  }
}
