import { computed, Injectable, inject, signal } from '@angular/core';
import type {
  Adjudication,
  AntithesisPair,
  AnalysisCell,
  AnalysisLine,
  CharacterMark,
  CharDiff,
  MarkTone,
  MeterTemplate,
  PoemIssue,
  PoemVersion,
  PoemWorkspace,
  Tone,
} from '../models/poem.models';
import {
  ReadingDictionaryService,
  evaluateAdjudication,
  evidenceSupports,
  stripPunctuation,
} from './reading-dictionary.service';

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
const TONE_DICTIONARY: Record<string, Tone> = {
  春: '平', 眠: '平', 不: '仄', 觉: '仄', 晓: '仄', 处: '仄', 闻: '平', 啼: '平', 鸟: '仄',
  夜: '仄', 来: '平', 风: '平', 雨: '仄', 声: '平', 花: '平', 落: '仄', 知: '平', 多: '平', 少: '仄',
  国: '仄', 破: '仄', 山: '平', 河: '平', 在: '仄', 城: '平', 深: '平', 木: '仄', 草: '仄', 独: '仄',
  明: '平', 月: '仄', 高: '平', 天: '平', 故: '仄', 乡: '平', 万: '仄', 里: '仄', 江: '平', 船: '平',
};

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
  private readonly readings = inject(ReadingDictionaryService);

  readonly workspace = signal<PoemWorkspace>(loadWorkspace());
  readonly selectedLine = signal(0);
  readonly selectedPosition = signal(4);
  readonly baselineVersionId = signal<string>('');
  readonly currentDiffIndex = signal(0);
  readonly toast = signal('');
  readonly undoCount = signal(0);
  readonly redoCount = signal(0);

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
      const rawLine = line;
      const chars = Array.from(stripPunctuation(rawLine));
      const cells: AnalysisCell[] = chars.map((char, position) => {
        const mark = version.marks[key(lineIndex, position)] ?? defaultMark();
        const expected = template.pattern[lineIndex * template.lineLength + position] ?? '中';
        const resolved = this.resolveCell(char, position, rawLine, mark);
        const actual = resolved.actual;
        let status: AnalysisCell['status'];
        let message: string;
        if (resolved.state === 'pending') {
          // 待核字位（未裁断多音字 / 词证不足 / 前后文对不上）单独提示，不进入出律结论
          status = 'review';
          message = resolved.reviewReason ?? '音义待核';
        } else if (actual === '?') {
          status = 'unknown';
          message = '尚未标注平仄';
        } else if (expected === '中') {
          status = 'correct';
          message = '可平可仄';
        } else if (actual === expected) {
          status = 'correct';
          message = '合律';
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
          status,
          message,
          mark,
          polyphone: resolved.polyphone,
          adjudicationState: resolved.state,
          reviewReason: resolved.reviewReason,
        };
      });
      const rhymeChars = template.rhymeLines.includes(lineIndex) ? cells.slice(-1).map((cell) => cell.char) : [];
      return {
        index: lineIndex,
        cells,
        rhymeChars,
        errors: cells.filter((cell) => cell.status === 'error').length,
        variants: cells.filter((cell) => cell.status === 'variant').length,
        reviews: cells.filter((cell) => cell.status === 'review').length,
      };
    });
  });

  /**
   * 字位平仄裁定顺序：
   * 1. 已通过词证核对的音义裁断 → 按裁定读音重算，覆盖手工平仄；
   * 2. 待核裁断（选词但词证不足/前后文对不上）→ 不进入出律结论；
   * 3. 未裁断多音字 → 沿用字典默认音，但标记待核，不计硬性出律；
   * 4. 其余 → 手工标注，其次普通字典值。
   */
  private resolveCell(
    char: string,
    position: number,
    rawLine: string,
    mark: CharacterMark,
  ): { actual: Tone; state: AnalysisCell['adjudicationState']; reviewReason?: string; polyphone: boolean } {
    const polyphone = this.readings.isPolyphone(char);
    if (mark.adjudication) {
      const evaluation = evaluateAdjudication(mark.adjudication, char, position, rawLine);
      const reading = this.readings.findReading(char, mark.adjudication.pinyin);
      if (evaluation.status === 'confirmed' && reading) {
        return { actual: reading.tone, state: 'confirmed', polyphone: true };
      }
      const fallback = mark.tone !== '?' ? mark.tone : (TONE_DICTIONARY[char] ?? '?');
      return {
        actual: reading?.tone ?? fallback,
        state: 'pending',
        reviewReason: evaluation.reviewReason,
        polyphone: true,
      };
    }
    if (polyphone) {
      // 未裁断多音字：只沿用字典默认音（手工平仄不得替代音义裁断），标待核，不凭默认音出律
      return { actual: this.readings.defaultTone(char) ?? '?', state: 'pending', reviewReason: '多音字未裁断音义，暂按字典默认音计，待补词证', polyphone: true };
    }
    return { actual: mark.tone === '?' ? (TONE_DICTIONARY[char] ?? '?') : mark.tone, state: 'none', polyphone: false };
  }

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
      line.cells.filter((cell) => cell.status === 'review').forEach((cell) => {
        const prefix = cell.adjudicationState === 'pending' && cell.mark.adjudication ? '音义裁断待核' : '多音字音义待核';
        issues.push({
          id: uid('issue'),
          level: 'warning',
          title: prefix,
          detail: `第 ${line.index + 1} 句“${cell.char}”：${cell.reviewReason ?? '缺少词证，不能进入出律结论'}`,
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
    const pendingReviews = analysis.reduce((total, line) => total + line.reviews, 0);
    if (!issues.some((issue) => issue.level === 'error') && pendingReviews > 0) {
      issues.unshift({
        id: 'meter-review',
        level: 'info',
        title: '硬性出律已清，仍有待核字位',
        detail: `共 ${pendingReviews} 个多音字音义待核；待核字位不进入出律结论，请在检视器补词证后裁定。`,
      });
    } else if (!issues.some((issue) => issue.level === 'error')) {
      issues.unshift({ id: 'meter-ok', level: 'info', title: '格律检查通过', detail: '当前未发现硬性出律，请继续核对可接受变体。' });
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
  }

  selectCell(line: number, position: number): void {
    this.selectedLine.set(line);
    this.selectedPosition.set(position);
  }

  setTemplate(id: string): void {
    this.commit((workspace) => {
      workspace.templateId = id;
      // 更换模板后按新的前后文位置重新核对已有裁断
      const version = this.versionIn(workspace);
      this.revalidateAdjudications(version, version.text.split('\n'));
    });
  }

  updateText(text: string): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const nextLines = text.split('\n');
      // 正文增删字后，原裁断先按新的前后文核对，对不上即退回待定
      this.revalidateAdjudications(version, nextLines);
      version.text = text;
    });
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

  /**
   * 字位音义裁断：从候选音义中定一个读音，并录下邻字 / 词证。
   * 只改当前字位；同一个字在别处以各自字位记录为准。
   * 词证须能落到当前句，否则只能停留在待核，不能据此出律。
   */
  adjudicateReading(pinyin: string, evidence: string): void {
    const line = this.selectedLine();
    const position = this.selectedPosition();
    const cell = this.analysis()[line]?.cells[position];
    if (!cell || !this.readings.isPolyphone(cell.char)) return;
    const reading = this.readings.findReading(cell.char, pinyin);
    if (!reading) return;
    const rawLine = this.lines()[line] ?? '';
    const supported = evidence.trim().length > 0 && evidenceSupports(cell.char, position, rawLine, evidence);
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(line, position);
      const existing = version.marks[id] ?? defaultMark();
      const adjudication: Adjudication = {
        char: cell.char,
        pinyin: reading.pinyin,
        gloss: reading.gloss,
        evidence: evidence.trim(),
        status: supported ? 'confirmed' : 'pending',
        reviewReason: supported ? undefined : '已选音义但缺少能落到当前句的邻字或词证，暂留待核',
        contextLine: stripPunctuation(rawLine),
        position,
        updatedAt: new Date().toISOString(),
      };
      // 裁断一旦成立，平仄随裁定音重算；手工平仄让位于裁断
      version.marks[id] = {
        ...existing,
        adjudication,
        tone: supported ? reading.tone : existing.tone,
        basis: existing.basis || (reading.rhyme ? `《平水韵》${reading.rhyme}` : ''),
      };
    });
  }

  /** 仅补改词证；改完立即按当前前后文重新核对并重算平仄 */
  updateAdjudicationEvidence(evidence: string): void {
    const line = this.selectedLine();
    const position = this.selectedPosition();
    const cell = this.analysis()[line]?.cells[position];
    if (!cell?.mark.adjudication) return;
    this.adjudicateReading(cell.mark.adjudication.pinyin, evidence);
  }

  /** 撤销字位裁断，回到字典缺省 + 待核状态 */
  clearAdjudication(): void {
    this.commit((workspace) => {
      const version = this.versionIn(workspace);
      const id = key(this.selectedLine(), this.selectedPosition());
      const mark = version.marks[id];
      if (!mark?.adjudication) return;
      const { adjudication: _removed, ...rest } = mark;
      version.marks[id] = { ...rest, tone: '?' };
    });
  }

  cycleTone(): void {
    const cell = this.selectedCell();
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
      const tags = line.cells
        .map((cell) => {
          const base = cell.actual === '?' ? '□' : cell.actual;
          if (cell.status === 'review') return `${cell.char}${base}〔待核〕`;
          if (cell.adjudicationState === 'confirmed' && cell.mark.adjudication) {
            return `${cell.char}${base}〈${cell.mark.adjudication.pinyin}〉`;
          }
          return `${cell.char}(${base})`;
        })
        .join(' ');
      const suffix = line.reviews > 0 ? `　（本句 ${line.reviews} 字待核，不列入出律）` : '';
      return `第 ${line.index + 1} 句：${tags}${suffix}`;
    });
    const adjudications = analysis.flatMap((line) =>
      line.cells
        .filter((cell) => cell.mark.adjudication)
        .map((cell) => {
          const verdict = cell.mark.adjudication as Adjudication;
          const state = verdict.status === 'confirmed' ? '已定' : `待核（${verdict.reviewReason ?? '缺词证'}）`;
          const proof = verdict.evidence.trim() ? verdict.evidence : '—';
          return `- 第 ${line.index + 1} 句第 ${cell.position + 1} 字“${cell.char}”取 ${verdict.pinyin}（${verdict.gloss}）｜词证：${proof}｜${state}`;
        }),
    );
    const pendingCount = analysis.reduce((total, line) => total + line.reviews, 0);
    const notes = this.issues().map((issue) => `[${issue.level.toUpperCase()}] ${issue.title}：${issue.detail}`);
    return [
      `# ${this.workspace().title} · 格律校对稿`,
      '',
      `底本：${active.name}`,
      `出处：${active.source}`,
      `待核字位：${pendingCount} 个（多音字未获词证前沿用字典默认音，不出出律结论）`,
      '',
      '## 字音标注',
      ...lines,
      '',
      '## 音义裁断',
      ...(adjudications.length ? adjudications : ['（暂无字位裁断）']),
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

  private persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.workspace()));
  }

  private isAcceptableVariant(template: MeterTemplate, line: number, position: number): boolean {
    if (template.lineLength === 5) return position === 0 || position === 2;
    return position === 0 || position === 2 || position === 4;
  }

  /**
   * 正文增删字或更换模板后的统一核对：
   * 逐条裁断按新的前后文重算状态——换字 / 移位 / 词证落空即退回待核，
   * 词证重新对上则恢复已定并同步平仄。只改本版本内各字位，不牵动其他版本。
   */
  private revalidateAdjudications(version: PoemVersion, lines: string[]): void {
    for (const [id, mark] of Object.entries(version.marks)) {
      if (!mark.adjudication) continue;
      const [lineIndexRaw, positionRaw] = id.split(':');
      const lineIndex = Number(lineIndexRaw);
      const position = Number(positionRaw);
      const rawLine = lines[lineIndex] ?? '';
      const char = Array.from(stripPunctuation(rawLine))[position] ?? '';
      const evaluation = char
        ? evaluateAdjudication(mark.adjudication, char, position, rawLine)
        : { status: 'pending' as const, reviewReason: '正文已删去该字位，原裁断退回待定' };
      if (evaluation.status === mark.adjudication.status && evaluation.reviewReason === mark.adjudication.reviewReason) {
        continue;
      }
      mark.adjudication = { ...mark.adjudication, status: evaluation.status, reviewReason: evaluation.reviewReason, updatedAt: new Date().toISOString() };
      if (evaluation.status === 'confirmed') {
        const reading = this.readings.findReading(char, mark.adjudication.pinyin);
        if (reading) mark.tone = reading.tone;
      }
    }
  }
}
