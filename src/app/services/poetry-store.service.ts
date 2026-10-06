import { computed, Injectable, signal } from '@angular/core';
import type {
  AnalysisCell,
  AnalysisLine,
  CharacterMark,
  CharDiff,
  MarkTone,
  MeterTemplate,
  PoemIssue,
  PolyphoneEntry,
  PoemVersion,
  PoemWorkspace,
  ReadingAdjudication,
  ReadingOption,
  Tone,
} from '../models/poem.models';

export const METER_TEMPLATES: MeterTemplate[] = [
  {
    id: 'wuyan-zeqi',
    name: '五言绝句 · 仄起首句不入韵',
    summary: '四句，每句五字；二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
  {
    id: 'wuyan-pingqi',
    name: '五言绝句 · 平起首句入韵',
    summary: '四句，每句五字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 5,
    pattern: ['中', '平', '中', '仄', '平', '仄', '仄', '中', '平', '仄', '中', '平', '中', '仄', '仄', '中', '平', '仄', '中', '平'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-zeqi',
    name: '七言绝句 · 仄起首句入韵',
    summary: '四句，每句七字；一、二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['仄', '仄', '中', '平', '中', '仄', '平', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中', '仄', '仄', '中', '平', '中', '仄', '中', '平', '中'],
    rhymeLines: [0, 1, 3],
  },
  {
    id: 'qiyan-pingqi',
    name: '七言绝句 · 平起首句不入韵',
    summary: '四句，每句七字；二、四句押韵',
    lineCount: 4,
    lineLength: 7,
    pattern: ['中', '平', '中', '仄', '仄', '中', '平', '仄', '仄', '中', '平', '平', '仄', '仄', '中', '平', '中', '仄', '中', '平', '仄', '仄', '中', '平', '中', '仄', '仄', '中', '平'],
    rhymeLines: [1, 3],
  },
];

const STORAGE_KEY = 'sologsb-1015-poetry-workspace-v1';
const PUNCTUATION = new Set(['，', '。', '！', '？', '；', '：', '、', ' ', '\t']);
const TONE_DICTIONARY: Record<string, Tone> = {
  春: '平', 眠: '平', 不: '仄', 觉: '仄', 晓: '仄', 处: '仄', 闻: '平', 啼: '平', 鸟: '仄',
  夜: '仄', 来: '平', 风: '平', 雨: '仄', 声: '平', 花: '平', 落: '仄', 知: '平', 多: '平', 少: '仄',
  国: '仄', 破: '仄', 山: '平', 河: '平', 在: '仄', 城: '平', 深: '平', 木: '仄', 草: '仄', 独: '仄',
  明: '平', 月: '仄', 高: '平', 天: '平', 故: '仄', 乡: '平', 万: '仄', 里: '仄', 江: '平', 船: '平',
};

/**
 * 多音字音义表：只提供候选与缺省音，不代表具体字位的结论。
 * 字位平仄一律以该字位的裁断为准；未裁断时回退 defaultReadingId 的平仄（待核）。
 */
const POLYPHONES: PolyphoneEntry[] = [
  {
    char: '看', defaultReadingId: 'kan4',
    readings: [
      { id: 'kan4', pinyin: 'kàn', tone: '仄', sense: '视线所及；观看、看见', examples: ['遥看', '相看', '看剑'] },
      { id: 'kan1', pinyin: 'kān', tone: '平', sense: '守视、看护', examples: ['看守', '看管', '看门'] },
    ],
  },
  {
    char: '行', defaultReadingId: 'xing2',
    readings: [
      { id: 'xing2', pinyin: 'xíng', tone: '平', sense: '行走、行事、将要', examples: ['行人', '行路', '送行'] },
      { id: 'hang2', pinyin: 'háng', tone: '平', sense: '行列、行伍、行业', examples: ['一行', '雁行', '行伍'] },
      { id: 'xing4', pinyin: 'xìng', tone: '仄', sense: '品行、操行', examples: ['德行', '品行', '言行'] },
    ],
  },
  {
    char: '重', defaultReadingId: 'zhong4',
    readings: [
      { id: 'zhong4', pinyin: 'zhòng', tone: '仄', sense: '分量大；厚重、重要', examples: ['重重', '轻重', '重镇'] },
      { id: 'chong2', pinyin: 'chóng', tone: '平', sense: '重复、重新、层叠', examples: ['重阳', '重逢', '千里重重'] },
    ],
  },
  {
    char: '长', defaultReadingId: 'chang2',
    readings: [
      { id: 'chang2', pinyin: 'cháng', tone: '平', sense: '长远、长久、长度', examples: ['长江', '长安', '长风'] },
      { id: 'zhang3', pinyin: 'zhǎng', tone: '仄', sense: '成长、年长、首长', examples: ['生长', '长者', '师长'] },
    ],
  },
  {
    char: '为', defaultReadingId: 'wei2',
    readings: [
      { id: 'wei2', pinyin: 'wéi', tone: '平', sense: '作为、成为、是', examples: ['成为', '无为', '为人'] },
      { id: 'wei4', pinyin: 'wèi', tone: '仄', sense: '因为、为了、替', examples: ['因为', '为谁', '为民'] },
    ],
  },
  {
    char: '中', defaultReadingId: 'zhong1',
    readings: [
      { id: 'zhong1', pinyin: 'zhōng', tone: '平', sense: '中间、内部、其中', examples: ['山中', '其中', '中原'] },
      { id: 'zhong4', pinyin: 'zhòng', tone: '仄', sense: '命中、中肯、遭受', examples: ['中举', '命中', '中酒'] },
    ],
  },
  {
    char: '教', defaultReadingId: 'jiao4',
    readings: [
      { id: 'jiao4', pinyin: 'jiào', tone: '仄', sense: '教化、教导、宗教', examples: ['教化', '教学', '不教'] },
      { id: 'jiao1', pinyin: 'jiāo', tone: '平', sense: '使、令；传授', examples: ['不教胡马', '教书', '教给'] },
    ],
  },
  {
    char: '思', defaultReadingId: 'si1',
    readings: [
      { id: 'si1', pinyin: 'sī', tone: '平', sense: '思考、思念（动词）', examples: ['相思', '思归', '秋思动'] },
      { id: 'si4', pinyin: 'sì', tone: '仄', sense: '思绪、愁思（名词）', examples: ['秋思', '愁思', '客思'] },
    ],
  },
  {
    char: '吹', defaultReadingId: 'chui1',
    readings: [
      { id: 'chui1', pinyin: 'chuī', tone: '平', sense: '吹气、吹奏（动词）', examples: ['吹风', '吹笛', '风吹'] },
      { id: 'chui4', pinyin: 'chuì', tone: '仄', sense: '鼓吹、竽笙之属（名词）', examples: ['鼓吹', '歌吹'] },
    ],
  },
  {
    char: '燕', defaultReadingId: 'yan4',
    readings: [
      { id: 'yan4', pinyin: 'yàn', tone: '仄', sense: '燕子', examples: ['燕子', '燕雀', '新燕'] },
      { id: 'yan1', pinyin: 'yān', tone: '平', sense: '古国名、燕地', examples: ['燕山', '燕赵', '燕然'] },
    ],
  },
  {
    char: '冠', defaultReadingId: 'guan1',
    readings: [
      { id: 'guan1', pinyin: 'guān', tone: '平', sense: '冠冕、帽子', examples: ['衣冠', '冠盖', '弹冠'] },
      { id: 'guan4', pinyin: 'guàn', tone: '仄', sense: '加冠、冠首、冠军', examples: ['弱冠', '冠军', '沐猴而冠'] },
    ],
  },
  {
    char: '间', defaultReadingId: 'jian1',
    readings: [
      { id: 'jian1', pinyin: 'jiān', tone: '平', sense: '中间、期间、之间', examples: ['人间', '花间', '其间'] },
      { id: 'jian4', pinyin: 'jiàn', tone: '仄', sense: '间隔、离间、间或', examples: ['间隔', '离间', '疏密相间'] },
    ],
  },
];

const POLYPHONE_MAP = new Map(POLYPHONES.map((entry) => [entry.char, entry]));

/** 从文本中抽出连续的汉字片段，用于把词证与正文核对 */
function hanziFragments(text: string): string[] {
  return text.match(/[一-龥]+/g) ?? [];
}

/**
 * 词证核对：至少一个长度不短于两字的汉字片段出现在本句正文中；
 * 单字只认作相邻字（紧贴本字之前或之后），防止随手写一个不相关的字蒙混。
 */
function witnessMatches(witness: string, sentence: string, char: string): boolean {
  const phrase = witness.trim();
  if (!phrase) return false;
  const chars = Array.from(sentence).filter((item) => !PUNCTUATION.has(item));
  const position = chars.indexOf(char);
  const fragments = hanziFragments(phrase);
  if (fragments.some((fragment) => Array.from(fragment).length >= 2 && sentence.includes(fragment))) return true;
  if (fragments.length === 1 && Array.from(fragments[0]).length === 1) {
    const token = fragments[0];
    return (position >= 0 && (chars[position - 1] === token || chars[position + 1] === token));
  }
  return false;
}

const clone = <T>(value: T): T => structuredClone(value);
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

function key(line: number, position: number): string {
  return `${line}:${position}`;
}

function defaultMark(): CharacterMark {
  return { tone: '?', rhyme: '', pauseAfter: false, basis: '', note: '' };
}

function initialWorkspace(): PoemWorkspace {
  const now = new Date().toISOString();
  const spring = '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。';
  const marks: Record<string, CharacterMark> = {};
  const cells = [
    ['晓', 0, '平', false], ['鸟', 1, '平', false], ['声', 2, '平', false], ['少', 3, '平', false],
  ] as const;
  cells.forEach(([char, line, tone, pause]) => {
    marks[key(line, 4)] = { tone, rhyme: 'A', pauseAfter: pause, basis: '《平水韵》上声十七筱', note: `${char} 为韵脚` };
  });
  marks[key(0, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '句中平声' };
  marks[key(1, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };
  marks[key(2, 2)] = { tone: '平', rhyme: '', pauseAfter: false, basis: '平水韵', note: '' };

  const variants = spring.replace('处处闻啼鸟', '处处闻啼鸟');
  const topVersion: PoemVersion = {
    id: 'version-main',
    name: '通行本 · 孟浩然集',
    source: '《孟浩然诗集笺注》',
    createdAt: now,
    text: variants,
    marks,
    antithesisPairs: [],
  };
  const variant: PoemVersion = {
    id: 'version-song',
    name: '宋刻本异文',
    source: '宋蜀刻本',
    createdAt: now,
    text: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。',
    marks: clone(marks),
    antithesisPairs: [],
  };
  return {
    title: '春晓',
    author: '孟浩然',
    templateId: 'wuyan-zeqi',
    versions: [topVersion, variant],
    activeVersionId: topVersion.id,
    updatedAt: now,
  };
}

function loadWorkspace(): PoemWorkspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWorkspace();
    const parsed = JSON.parse(raw) as PoemWorkspace;
    return parsed.versions?.length ? parsed : initialWorkspace();
  } catch {
    return initialWorkspace();
  }
}

@Injectable({ providedIn: 'root' })
export class PoetryStoreService {
  readonly workspace = signal<PoemWorkspace>(loadWorkspace());
  readonly selectedLine = signal(0);
  readonly selectedPosition = signal(4);
  readonly baselineVersionId = signal<string>('');
  readonly currentDiffIndex = signal(0);
  readonly toast = signal('');
  readonly undoCount = signal(0);
  readonly redoCount = signal(0);
  // 当前选中字位的裁断草稿：候选音 + 词证，确认后才写入字位
  readonly draftReadingId = signal('');
  readonly draftWitness = signal('');

  private undoStack: PoemWorkspace[] = [];
  private redoStack: PoemWorkspace[] = [];

  readonly activeVersion = computed(() => {
    const state = this.workspace();
    return state.versions.find((version) => version.id === state.activeVersionId) ?? state.versions[0];
  });

  readonly template = computed(() => {
    return METER_TEMPLATES.find((item) => item.id === this.workspace().templateId) ?? METER_TEMPLATES[0];
  });

  readonly lines = computed(() => this.activeVersion().text.split('\n'));

  readonly analysis = computed<AnalysisLine[]>(() => {
    const version = this.activeVersion();
    const template = this.template();
    return this.lines().map((line, lineIndex) => {
      const chars = Array.from(line).filter((char) => !PUNCTUATION.has(char));
      const cells: AnalysisCell[] = chars.map((char, position) => {
        const mark = version.marks[key(lineIndex, position)] ?? defaultMark();
        const expected = template.pattern[lineIndex * template.lineLength + position] ?? '中';
        const polyphone = POLYPHONE_MAP.get(char);
        // 退回待核的裁断即使字已更换也保留展示（说明退回原因）；只有 confirmed 且字相符才取其音
        const adjudication = mark.adjudication;
        const adjudicationConfirmed = !!adjudication && adjudication.char === char && adjudication.status === 'confirmed';
        // 未裁断（或已退回待核）的多音字：沿用字典缺省音，但只能算待核
        const pendingReview = !!polyphone && !adjudicationConfirmed;

        let actual: Tone;
        let toneSource: AnalysisCell['toneSource'];
        if (adjudicationConfirmed) {
          actual = adjudication.tone;
          toneSource = 'adjudication';
        } else if (mark.tone !== '?' && !polyphone) {
          actual = mark.tone;
          toneSource = 'manual';
        } else {
          const fallback = polyphone
            ? polyphone.readings.find((item) => item.id === polyphone.defaultReadingId)?.tone
            : TONE_DICTIONARY[char];
          actual = fallback ?? '?';
          toneSource = actual === '?' ? 'unknown' : 'dictionary';
        }

        let status: AnalysisCell['status'] = 'neutral';
        let message = '标点或不计律位置';
        if (actual === '?') {
          status = 'unknown';
          message = '尚未标注平仄';
        } else if (pendingReview) {
          // 待核多音字：无论缺省音是否撞上模板，都不进入出律结论
          status = 'variant';
          if (adjudication?.status === 'pending') {
            message = `原裁断已退回待核：${adjudication.reason || '词证与新前后文对不上'}；现暂按缺省${actual}声比对`;
          } else {
            const defaultPinyin = polyphone?.readings.find((item) => item.id === polyphone.defaultReadingId)?.pinyin;
            message = `多音字：字典缺省读“${defaultPinyin}”判为${actual}声，须凭邻字或词证裁断后才能定出律`;
          }
        } else if (expected === '中') {
          status = 'correct';
          message = '可平可仄';
        } else if (actual === expected) {
          status = 'correct';
          message = toneSource === 'adjudication'
            ? `已按音义“${adjudication?.pinyin}·${adjudication?.sense}”裁定，合律`
            : '合律';
        } else if (this.isAcceptableVariant(template, lineIndex, position)) {
          status = 'variant';
          message = '一三五位置的可接受变体';
        } else {
          status = 'error';
          message = `此处应为${expected}声`;
        }
        return {
          char,
          position,
          expected,
          actual,
          toneSource,
          pendingReview,
          polyphone,
          adjudication,
          status,
          message,
          mark,
        };
      });
      const rhymeChars = template.rhymeLines.includes(lineIndex) ? cells.slice(-1).map((cell) => cell.char) : [];
      return {
        index: lineIndex,
        cells,
        rhymeChars,
        errors: cells.filter((cell) => cell.status === 'error').length,
        variants: cells.filter((cell) => cell.status === 'variant').length,
        pending: cells.filter((cell) => cell.pendingReview).length,
      };
    });
  });

  readonly issues = computed<PoemIssue[]>(() => {
    const analysis = this.analysis();
    const version = this.activeVersion();
    const template = this.template();
    const issues: PoemIssue[] = [];
    analysis.forEach((line) => {
      line.cells.filter((cell) => cell.status === 'error').forEach((cell) => {
        issues.push({
          id: uid('issue'),
          level: 'error',
          title: '出律位置',
          detail: `第 ${line.index + 1} 句“${cell.char}”：${cell.message}`,
          line: line.index,
          position: cell.position,
        });
      });
      line.cells.filter((cell) => cell.pendingReview).forEach((cell) => {
        const state = cell.adjudication?.status === 'pending' ? '原裁断已退回待核' : '多音字待裁断';
        const detail = cell.actual === '?'
          ? `第 ${line.index + 1} 句“${cell.char}”（${state}）：尚无字典缺省音，须凭邻字或词证裁定音义。`
          : `第 ${line.index + 1} 句“${cell.char}”（${state}）：现沿字典缺省${cell.actual}声比对，须凭邻字或词证裁定音义后才能定出律。`;
        issues.push({
          id: uid('issue'),
          level: 'warning',
          title: '音义待核',
          detail,
          line: line.index,
          position: cell.position,
        });
      });
      if (line.cells.some((cell) => cell.status === 'unknown')) {
        issues.push({ id: uid('issue'), level: 'warning', title: '存在未标注字', detail: `第 ${line.index + 1} 句仍有平仄未确认。`, line: line.index });
      }
    });
    const rhymeCells = template.rhymeLines.map((line) => analysis[line]?.cells.at(-1)).filter(Boolean);
    const rhymeGroups = new Map<string, string[]>();
    rhymeCells.forEach((cell) => {
      if (!cell?.mark.rhyme) {
        issues.push({ id: uid('issue'), level: 'warning', title: '韵脚缺少韵部', detail: `第 ${(cell?.position ?? 0) + 1} 句末字尚未指定韵部。` });
        return;
      }
      rhymeGroups.set(cell.mark.rhyme, [...(rhymeGroups.get(cell.mark.rhyme) ?? []), cell.char]);
    });
    rhymeGroups.forEach((chars, rhyme) => {
      const duplicate = chars.find((char, index) => chars.indexOf(char) !== index);
      if (duplicate) issues.push({ id: uid('issue'), level: 'warning', title: '重复用韵', detail: `韵部 ${rhyme} 重复使用末字“${duplicate}”。` });
    });
    if (version.antithesisPairs.length === 0) {
      issues.push({ id: 'antithesis-empty', level: 'info', title: '尚未标记对仗', detail: '可在检视器中把两句建立对仗关系。' });
    }
    if (!issues.some((issue) => issue.level === 'error')) {
      const pendingCount = analysis.reduce((sum, line) => sum + line.pending, 0);
      issues.unshift({
        id: 'meter-ok',
        level: 'info',
        title: '格律检查通过',
        detail: pendingCount
          ? `已裁定字位未发现硬性出律；另有 ${pendingCount} 个多音字待核，结论暂不含这些字位。`
          : '当前未发现硬性出律，请继续核对可接受变体。',
      });
    }
    return issues;
  });

  readonly diff = computed<CharDiff[]>(() => {
    const left = this.workspace().versions.find((version) => version.id === this.baselineVersionId());
    const right = this.activeVersion();
    if (!left || left.id === right.id) return [];
    const leftChars = Array.from(left.text.replace(/\n/g, ''));
    const rightChars = Array.from(right.text.replace(/\n/g, ''));
    const size = Math.max(leftChars.length, rightChars.length);
    return Array.from({ length: size }, (_, index) => ({
      index,
      left: leftChars[index] ?? '',
      right: rightChars[index] ?? '',
      changed: leftChars[index] !== rightChars[index],
    }));
  });

  readonly differences = computed(() => this.diff().filter((item) => item.changed).map((item) => item.index));
  readonly baselineVersion = computed(() => this.workspace().versions.find((version) => version.id === this.baselineVersionId()));

  selectVersion(id: string): void {
    this.workspace.update((workspace) => ({ ...workspace, activeVersionId: id }));
    this.syncDraft();
  }

  selectCell(line: number, position: number): void {
    this.selectedLine.set(line);
    this.selectedPosition.set(position);
    this.syncDraft();
  }

  setTemplate(id: string): void {
    this.commit((workspace) => {
      workspace.templateId = id;
      // 更换模板不改文字，原裁断按原前后文仍然成立；平仄在 analysis 中按新模板即时重算
    });
  }

  updateText(text: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.text = text;
      // 正文增删字后，原裁断一律按新前后文核对；对不上的退回待核
      this.revalidateAdjudications(version);
    });
    this.syncDraft();
  }

  updateTitle(title: string): void {
    this.commit((workspace) => {
      workspace.title = title;
    });
  }

  updateVersionSource(source: string): void {
    this.commit((workspace) => {
      this.versionIn(workspace).source = source;
    });
  }

  setMark(patch: Partial<CharacterMark>): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      version.marks[id] = { ...defaultMark(), ...version.marks[id], ...patch };
    });
  }

  /** 手工平仄只对非多音字开放；多音字必须走音义裁断 */
  setManualTone(tone: MarkTone | '?'): void {
    const cell = this.selectedCell();
    if (cell?.polyphone) return;
    this.setMark({ tone });
  }

  setDraftReading(readingId: string): void {
    this.draftReadingId.set(readingId);
  }

  setDraftWitness(witness: string): void {
    this.draftWitness.set(witness);
  }

  /** 词证能否在选中字位的本句前后文中核对上 */
  draftWitnessValid(): boolean {
    const cell = this.selectedCell();
    if (!cell || !this.draftReadingId()) return false;
    const sentence = this.lines()[this.selectedLine()] ?? '';
    return witnessMatches(this.draftWitness(), sentence, cell.char);
  }

  /**
   * 确认音义裁断：只写当前字位，并以裁定音义的平仄立即重算该字位；
   * 无词证或词证核对不上时只能留在待核，不进入出律结论。
   */
  confirmAdjudication(): boolean {
    const cell = this.selectedCell();
    if (!cell?.polyphone) return false;
    const reading = cell.polyphone.readings.find((item) => item.id === this.draftReadingId());
    const witness = this.draftWitness().trim();
    if (!reading || !witness) return false;
    const sentence = this.lines()[this.selectedLine()] ?? '';
    const valid = witnessMatches(witness, sentence, cell.char);
    const adjudication: ReadingAdjudication = {
      char: cell.char,
      readingId: reading.id,
      pinyin: reading.pinyin,
      tone: reading.tone,
      sense: reading.sense,
      witness,
      status: valid ? 'confirmed' : 'pending',
      reason: valid ? '' : '词证未能在本句前后文中核对上',
      updatedAt: new Date().toISOString(),
    };
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = { ...defaultMark(), ...version.marks[id] };
      mark.adjudication = adjudication;
      if (valid) {
        mark.tone = reading.tone;
        const clause = `音义裁断：${reading.pinyin}（${reading.sense}），词证“${witness}”`;
        mark.basis = mark.basis ? `${mark.basis}；${clause}` : clause;
      }
      version.marks[id] = mark;
    });
    this.syncDraft();
    return valid;
  }

  /** 词证仍与前后文相符时，把退回待核的原裁断重新确认 */
  reconfirmAdjudication(): boolean {
    const cell = this.selectedCell();
    if (!cell?.polyphone || cell.adjudication?.status !== 'pending') return false;
    const reading = cell.polyphone.readings.find((item) => item.id === cell.adjudication?.readingId);
    const sentence = this.lines()[this.selectedLine()] ?? '';
    if (!reading || !witnessMatches(cell.adjudication.witness, sentence, cell.char)) return false;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = { ...defaultMark(), ...version.marks[id] };
      if (mark.adjudication) {
        mark.adjudication = { ...mark.adjudication, status: 'confirmed', reason: '', updatedAt: new Date().toISOString() };
        mark.tone = reading.tone;
      }
      version.marks[id] = mark;
    });
    this.syncDraft();
    return true;
  }

  /** 清除当前字位的裁断，退回字典缺省（待核），只影响当前字位 */
  clearAdjudication(): void {
    const cell = this.selectedCell();
    if (!cell) return;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = { ...defaultMark(), ...version.marks[id] };
      delete mark.adjudication;
      mark.tone = '?';
      version.marks[id] = mark;
    });
    this.syncDraft();
  }

  cycleTone(): void {
    const cell = this.selectedCell();
    if (cell?.polyphone) return;
    const next: Record<Tone, MarkTone | '?'> = { '?': '平', '平': '仄', '仄': '中', '中': '?' };
    this.setMark({ tone: next[cell?.actual ?? '?'] });
  }

  togglePause(): void {
    const cell = this.selectedCell();
    this.setMark({ pauseAfter: !(cell?.mark.pauseAfter ?? false) });
  }

  cycleRhyme(): void {
    const cell = this.selectedCell();
    const current = cell?.mark.rhyme ?? '';
    const next = current === '' ? 'A' : current === 'A' ? 'B' : current === 'B' ? 'C' : '';
    this.setMark({ rhyme: next });
  }

  addAntithesis(): void {
    const line = this.selectedLine();
    const other = line === 0 ? 1 : line - 1;
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      if (version.antithesisPairs.some((pair) => pair.leftLine === line && pair.rightLine === other)) return;
      version.antithesisPairs.push({ id: uid('pair'), leftLine: Math.min(line, other), rightLine: Math.max(line, other), note: '结构相对，词性相应。' });
    });
  }

  removeAntithesis(id: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      version.antithesisPairs = version.antithesisPairs.filter((pair) => pair.id !== id);
    });
  }

  updateAntithesis(id: string, note: string): void {
    this.commit((workspace) => {
      const pair = this.versionIn(workspace).antithesisPairs.find((item) => item.id === id);
      if (pair) pair.note = note;
    });
  }

  snapshot(): void {
    const active = clone(this.activeVersion());
    active.id = uid('version');
    active.name = `校勘稿 ${this.workspace().versions.length}`;
    active.createdAt = new Date().toISOString();
    this.commit((workspace) => {
      workspace.versions.unshift(active);
      workspace.activeVersionId = active.id;
    });
    this.toast.set('已建立独立校勘稿');
  }

  duplicateActiveAsBaseline(): void {
    this.baselineVersionId.set(this.activeVersion().id);
  }

  nextDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const current = values.findIndex((index) => index >= this.currentDiffIndex());
    this.currentDiffIndex.set(values[(current + 1) % values.length]);
  }

  previousDifference(): void {
    const values = this.differences();
    if (!values.length) return;
    const reverse = [...values].reverse();
    const current = reverse.findIndex((index) => index <= this.currentDiffIndex());
    this.currentDiffIndex.set(reverse[(current + 1) % reverse.length]);
  }

  undo(): void {
    const previous = this.undoStack.pop();
    if (!previous) return;
    this.redoStack.push(clone(this.workspace()));
    this.workspace.set(previous);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  redo(): void {
    const next = this.redoStack.pop();
    if (!next) return;
    this.undoStack.push(clone(this.workspace()));
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(this.redoStack.length);
    this.persist();
  }

  exportProofreadCopy(): string {
    const active = this.activeVersion();
    const analysis = this.analysis();
    const lines = analysis.map((line) => {
      const tags = line.cells.map((cell) => {
        const suffix = cell.pendingReview ? '〔待核〕' : '';
        return `${cell.char}${cell.actual === '?' ? '□' : `(${cell.actual})`}${suffix}`;
      }).join(' ');
      return `第 ${line.index + 1} 句：${tags}`;
    });
    const adjudicated = analysis.flatMap((line) => line.cells
      .filter((cell) => cell.adjudication?.status === 'confirmed')
      .map((cell) => {
        const adj = cell.adjudication!;
        return `第 ${line.index + 1} 句“${cell.char}”：${adj.pinyin}（${adj.tone}声）· ${adj.sense}；词证“${adj.witness}”`;
      }));
    const pending = analysis.flatMap((line) =>
      line.cells.filter((cell) => cell.pendingReview).map((cell) => {
        const state = cell.adjudication?.status === 'pending'
          ? `原裁断（${cell.adjudication.pinyin}）已退回待核：${cell.adjudication.reason}`
          : `尚未裁断，暂沿字典缺省${cell.actual === '?' ? '音' : `${cell.actual}声`}`;
        return `第 ${line.index + 1} 句“${cell.char}”〔待核〕：${state}，该字位不进入出律结论`;
      }),
    );
    const notes = this.issues().map((issue) => `[${issue.level.toUpperCase()}] ${issue.title}：${issue.detail}`);
    return [
      `# ${this.workspace().title} · 格律校对稿`,
      '',
      `底本：${active.name}`,
      `出处：${active.source}`,
      '',
      '## 字音标注',
      ...lines,
      '',
      '## 音义裁断（以字位为准）',
      ...(adjudicated.length ? adjudicated : ['（暂无已确认裁断）']),
      '',
      '## 待核多音字（不进入出律结论）',
      ...(pending.length ? pending : ['（无）']),
      '',
      '## 检查记录',
      ...notes,
    ].join('\n');
  }

  downloadProofreadCopy(): void {
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(new Blob([this.exportProofreadCopy()], { type: 'text/markdown;charset=utf-8' }));
    anchor.download = `${this.workspace().title}-格律校对稿.md`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  }

  selectedCell(): AnalysisCell | undefined {
    return this.analysis()[this.selectedLine()]?.cells[this.selectedPosition()];
  }

  private commit(mutator: (workspace: PoemWorkspace) => void): void {
    this.undoStack.push(clone(this.workspace()));
    if (this.undoStack.length > 80) this.undoStack.shift();
    this.redoStack = [];
    const next = clone(this.workspace());
    mutator(next);
    next.updatedAt = new Date().toISOString();
    this.workspace.set(next);
    this.undoCount.set(this.undoStack.length);
    this.redoCount.set(0);
    this.persist();
  }

  private versionIn(workspace: PoemWorkspace): PoemVersion {
    const version = workspace.versions.find((item) => item.id === workspace.activeVersionId) ?? workspace.versions[0];
    return version;
  }

  /** 选中字位变化后，把候选音与词证草稿同步为该字位的现有裁断 */
  private syncDraft(): void {
    const cell = this.selectedCell();
    const polyphone = cell?.polyphone;
    if (cell && polyphone) {
      this.draftReadingId.set(cell.adjudication?.readingId ?? polyphone.defaultReadingId);
      this.draftWitness.set(cell.adjudication?.witness ?? '');
    } else {
      this.draftReadingId.set('');
      this.draftWitness.set('');
    }
  }

  /**
   * 正文改动后的裁断复核：逐字位按新前后文核对词证。
   * 字已更换、候选音失效或词证对不上新前后文的，一律退回待核；对得上的保留裁定。
   */
  private revalidateAdjudications(version: PoemVersion): void {
    const lines = version.text.split('\n');
    Object.entries(version.marks).forEach(([id, mark]) => {
      const adjudication = mark.adjudication;
      if (!adjudication || adjudication.status !== 'confirmed') return;
      const [lineIndexRaw, positionRaw] = id.split(':');
      const lineIndex = Number(lineIndexRaw);
      const position = Number(positionRaw);
      const sentence = lines[lineIndex] ?? '';
      const chars = Array.from(sentence).filter((char) => !PUNCTUATION.has(char));
      const char = chars[position];
      const polyphone = char ? POLYPHONE_MAP.get(char) : undefined;
      const reading = polyphone?.readings.find((item) => item.id === adjudication.readingId);
      const stillFits = char === adjudication.char && !!reading && witnessMatches(adjudication.witness, sentence, char);
      if (stillFits) return;
      const reason = char !== adjudication.char
        ? `该字位已由“${adjudication.char}”改为“${char ?? '空'}”`
        : !reading
          ? `候选音义“${adjudication.pinyin}”已不适用`
          : `词证“${adjudication.witness}”在新前后文中核对不上`;
      mark.adjudication = { ...adjudication, status: 'pending', reason, updatedAt: new Date().toISOString() };
      mark.tone = '?';
    });
  }

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspace()));
  }

  private isAcceptableVariant(template: MeterTemplate, line: number, position: number): boolean {
    if (template.lineLength === 5) return position === 0 || position === 2;
    return position === 0 || position === 2 || position === 4;
  }
}
