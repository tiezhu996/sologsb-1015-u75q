import { TestBed } from '@angular/core/testing';
import { PoetryStoreService } from './poetry-store.service';

describe('PoetryStoreService 多音字音义裁断', () => {
  let store: PoetryStoreService;

  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
    TestBed.configureTestingModule({});
    store = TestBed.inject(PoetryStoreService);
    // 五言仄起首句不入韵：首句 仄 仄 中 平 仄；第二字位须仄。
    // 只改第一句；两句“重”分别落在第 2、5 字位，用于验证裁断不牵动同字他处。
    store.updateText('山重水复重\n春眠不觉晓\n处处闻啼鸟\n花落知多少');
  });

  function cell(line: number, position: number) {
    return store.analysis()[line].cells[position];
  }

  it('未裁断多音字沿用字典默认音但标待核，不出出律', () => {
    expect(cell(0, 1).char).toBe('重');
    expect(cell(0, 1).actual).toBe('仄'); // 字典默认 zhòng
    expect(cell(0, 1).status).toBe('review');
    expect(store.analysis()[0].errors).toBe(0);
    expect(store.analysis()[0].reviews).toBe(2);
    expect(store.issues().some((issue) => issue.level === 'error' && issue.line === 0)).toBeFalse();
  });

  it('定音且词证成立后立即按新音重算平仄（chóng 平声在第二字位即出律）', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    const target = cell(0, 1);
    expect(target.adjudicationState).toBe('confirmed');
    expect(target.actual).toBe('平');
    expect(target.status).toBe('error');
    expect(store.analysis()[0].errors).toBe(1);
    expect(store.issues().some((issue) => issue.level === 'error' && issue.position === 1)).toBeTrue();
  });

  it('词证落空只能待核，不能进入出律结论', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '轻重'); // 句中并无“轻重”
    expect(cell(0, 1).adjudicationState).toBe('pending');
    expect(cell(0, 1).status).toBe('review');
    expect(store.analysis()[0].errors).toBe(0);
  });

  it('空词证同样留在待核', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '   ');
    expect(cell(0, 1).adjudicationState).toBe('pending');
    expect(store.analysis()[0].errors).toBe(0);
  });

  it('裁断只改当前字位，同字别处以各自字位为准', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    expect(cell(0, 1).adjudicationState).toBe('confirmed');
    expect(cell(0, 4).adjudicationState).toBe('pending'); // 同为“重”，未受牵动
    expect(cell(0, 4).actual).toBe('仄');
  });

  it('撤回裁断后回到字典缺省与待核', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    expect(cell(0, 1).status).toBe('error');
    store.clearAdjudication();
    expect(cell(0, 1).adjudicationState).toBe('pending');
    expect(cell(0, 1).actual).toBe('仄');
    expect(store.analysis()[0].errors).toBe(0);
  });

  it('正文改字后原裁断按新前后文核对，对不上退回待定', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    expect(cell(0, 1).status).toBe('error');
    store.updateText('山青水复重\n春眠不觉晓\n处处闻啼鸟\n花落知多少');
    const target = store.analysis()[0].cells[1];
    expect(target.char).toBe('青');
    expect(target.status).toBe('review');
    expect(target.reviewReason).toContain('改字');
    expect(store.analysis()[0].errors).toBe(0);
  });

  it('增字使字位移动后裁断退回待核', () => {
    store.updateText('又山重水复\n春眠不觉晓\n处处闻啼鸟\n花落知多少');
    store.selectCell(0, 2);
    store.adjudicateReading('chóng', '山重');
    expect(cell(0, 2).adjudicationState).toBe('confirmed');
    store.updateText('又青山重水\n春眠不觉晓\n处处闻啼鸟\n花落知多少'); // “重”移到第 4 位
    expect(store.analysis()[0].cells[2].status).toBe('review');
  });

  it('前后文恢复使词证重新对上时可回到已定', () => {
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    store.updateText('山青水复重\n春眠不觉晓\n处处闻啼鸟\n花落知多少');
    expect(cell(0, 1).adjudicationState).toBe('pending');
    store.updateText('山重水复重\n春眠不觉晓\n处处闻啼鸟\n花落知多少');
    expect(cell(0, 1).adjudicationState).toBe('confirmed');
    expect(cell(0, 1).actual).toBe('平');
  });

  it('导出校对稿标明待核并列出音义裁断', () => {
    expect(store.exportProofreadCopy()).toContain('〔待核〕');
    store.selectCell(0, 1);
    store.adjudicateReading('chóng', '山重');
    const exported = store.exportProofreadCopy();
    expect(exported).toContain('chóng');
    expect(exported).toContain('词证：山重');
    expect(exported).toContain('已定');
    expect(exported).toContain('待核字位：1 个');
  });
});
