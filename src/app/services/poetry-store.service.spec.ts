import { PoetryStoreService } from './poetry-store.service';

function cell(store: PoetryStoreService, line: number, position: number) {
  return store.analysis()[line].cells[position];
}

function workspaceWith(text: string, templateId = 'wuyan-zeqi'): PoetryStoreService {
  const store = new PoetryStoreService();
  store.selectVersion(store.workspace().versions[0].id);
  store.setTemplate(templateId);
  store.updateText(text);
  return store;
}

describe('PoetryStoreService · 多音字音义裁断', () => {
  beforeEach(() => {
    let storage: Record<string, string> = {};
    spyOn(localStorage, 'getItem').and.callFake((key: string) => storage[key] ?? null);
    spyOn(localStorage, 'setItem').and.callFake((key: string, value: string) => {
      storage[key] = value;
    });
  });

  it('未裁断多音字沿字典缺省但标待核，不进入出律', () => {
    // “重”在“看重”语境读 zhòng（仄）；此处位于第二字，缺省即仄
    const store = workspaceWith('遥重青山色，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    const target = cell(store, 0, 1);
    expect(target.char).toBe('重');
    expect(target.pendingReview).toBeTrue();
    expect(target.actual).toBe('仄');
    expect(target.toneSource).toBe('dictionary');
    expect(target.status).not.toBe('error');
    expect(store.issues().some((i) => i.level === 'error' && i.position === 1)).toBeFalse();
    expect(store.issues().some((i) => i.level === 'warning' && i.title === '音义待核')).toBeTrue();
  });

  it('凭本句词证裁定后平仄立即重算，且只改当前字位', () => {
    // 首句“千里重重山”：第三字“重”叠用应为 chóng（平），模板位置2应平以外的中
    const text = '千里重重色，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。';
    const store = workspaceWith(text);
    store.selectCell(0, 2);
    store.setDraftReading('chong2');
    store.setDraftWitness('千里重重');
    expect(store.confirmAdjudication()).toBeTrue();

    const adjudicated = cell(store, 0, 2);
    expect(adjudicated.actual).toBe('平');
    expect(adjudicated.toneSource).toBe('adjudication');
    expect(adjudicated.pendingReview).toBeFalse();
    expect(adjudicated.status).toBe('correct');

    // 同一行另一个“重”字（位置3）不受牵连，继续字典缺省、待核
    const other = cell(store, 0, 3);
    expect(other.char).toBe('重');
    expect(other.pendingReview).toBeTrue();
    expect(other.actual).toBe('仄');
  });

  it('词证不在本句前后文中时只能留在待核，不能判出律', () => {
    const store = workspaceWith('千里重关色，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 2);
    store.setDraftReading('chong2');
    store.setDraftWitness('重阳'); // 本句无“重阳”
    expect(store.confirmAdjudication()).toBeFalse();
    const target = cell(store, 0, 2);
    expect(target.adjudication?.status).toBe('pending');
    expect(target.pendingReview).toBeTrue();
    expect(target.status).not.toBe('error');
  });

  it('单字词证只认紧邻字', () => {
    const store = workspaceWith('遥看青山色，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 1);
    store.setDraftReading('kan4');
    store.setDraftWitness('看'); // 就是本字，不算词证
    expect(store.confirmAdjudication()).toBeFalse();
    store.setDraftWitness('遥'); // 紧贴“看”之前
    expect(store.confirmAdjudication()).toBeTrue();
  });

  it('正文改动后词证对不上，原裁断退回待核；对得上则保留', () => {
    const store = workspaceWith('重阳山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 0);
    store.setDraftReading('chong2');
    store.setDraftWitness('重阳');
    store.confirmAdjudication();
    expect(cell(store, 0, 0).adjudication?.status).toBe('confirmed');

    // 改成“看”，字位换字：原裁断退回待核
    store.updateText('看阳山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    const replaced = cell(store, 0, 0);
    expect(replaced.char).toBe('看');
    expect(replaced.pendingReview).toBeTrue();
    expect(replaced.adjudication?.status).toBe('pending');
    expect(replaced.adjudication?.reason).toContain('看');

    // 另一稿：同字但词证被删，同样退回待核
    const store2 = workspaceWith('重阳山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store2.selectCell(0, 0);
    store2.setDraftReading('chong2');
    store2.setDraftWitness('重阳');
    store2.confirmAdjudication();
    store2.updateText('重关山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    const witnessLost = cell(store2, 0, 0);
    expect(witnessLost.char).toBe('重');
    expect(witnessLost.adjudication?.status).toBe('pending');
    expect(witnessLost.adjudication?.reason).toContain('词证');
  });

  it('更换模板不牵动裁断，只按新模板重算比对', () => {
    const store = workspaceWith('重阳山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 0);
    store.setDraftReading('chong2');
    store.setDraftWitness('重阳');
    store.confirmAdjudication();
    store.setTemplate('qiyan-pingqi');
    const target = cell(store, 0, 0);
    expect(target.adjudication?.status).toBe('confirmed');
    expect(target.actual).toBe('平');
  });

  it('多音字手工平仄按钮不生效，必须走裁断', () => {
    const store = workspaceWith('遥重青山色，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 1);
    store.setManualTone('平');
    expect(cell(store, 0, 1).actual).toBe('仄');
    expect(cell(store, 0, 1).pendingReview).toBeTrue();
  });

  it('待核多音字即便缺省音与模板冲突也不计出律', () => {
    // 仄起句第二字应仄。“看中酒”里的“中”语境是“中酒/命中”（应 zhòng 仄），
    // 字典缺省却读 zhōng 平：冲突存在，但未裁断只能待核，不允许据此判出律。
    const text = '看中酒初熟，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。';
    const store = workspaceWith(text);
    const target = cell(store, 0, 1);
    expect(target.char).toBe('中');
    expect(target.pendingReview).toBeTrue();
    expect(target.actual).toBe('平');
    expect(store.issues().some((i) => i.level === 'error' && i.position === 1)).toBeFalse();
    // 裁定为 zhòng 后才允许出律结论成立（此例恰好合律）
    store.selectCell(0, 1);
    store.setDraftReading('zhong4');
    store.setDraftWitness('中酒');
    expect(store.confirmAdjudication()).toBeTrue();
    expect(cell(store, 0, 1).status).toBe('correct');
  });

  it('导出校对稿标明待核并列出已裁定词证', () => {
    const store = workspaceWith('重阳山色好，\n春眠不觉晓。\n夜来风雨声，\n花落知多少。');
    store.selectCell(0, 0);
    store.setDraftReading('chong2');
    store.setDraftWitness('重阳');
    store.confirmAdjudication();
    const md = store.exportProofreadCopy();
    expect(md).toContain('## 音义裁断');
    expect(md).toContain('chóng');
    expect(md).toContain('词证“重阳”');
    expect(md).toContain('待核');
  });
});
