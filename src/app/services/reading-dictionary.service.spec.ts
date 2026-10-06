import { TestBed } from '@angular/core/testing';
import { ReadingDictionaryService, evidenceSupports, evaluateAdjudication, stripPunctuation } from './reading-dictionary.service';
import type { Adjudication } from '../models/poem.models';

function adjudication(overrides: Partial<Adjudication> = {}): Adjudication {
  return {
    char: '重',
    pinyin: 'chóng',
    gloss: '重复、重新、层',
    evidence: '重阳',
    status: 'confirmed',
    contextLine: '重阳独酌杯中酒',
    position: 0,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ReadingDictionaryService', () => {
  let service: ReadingDictionaryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ReadingDictionaryService);
  });

  it('识别多音字并提供候选音义', () => {
    expect(service.isPolyphone('看')).toBeTrue();
    expect(service.readingsOf('看').length).toBe(2);
    expect(service.isPolyphone('春')).toBeFalse();
  });

  it('字典默认读音只作缺省', () => {
    expect(service.defaultTone('重')).toBe('仄');
    expect(service.findReading('重', 'chóng')?.tone).toBe('平');
  });

  it('剔除标点后保留字序', () => {
    expect(stripPunctuation('春眠不觉晓，')).toBe('春眠不觉晓');
  });

  describe('evidenceSupports 词证校验', () => {
    // “重阳独酌杯中酒”：重(0) 阳(1) 独(2) 酌(3) 杯(4) 中(5) 酒(6)
    const line = '重阳独酌杯中酒';

    it('双字词证出现在本句即成立', () => {
      expect(evidenceSupports('重', 0, line, '重阳')).toBeTrue();
    });

    it('词证不在句中不成立', () => {
      expect(evidenceSupports('重', 0, line, '重重')).toBeFalse();
    });

    it('空词证不成立，不能据此裁定', () => {
      expect(evidenceSupports('重', 0, line, '   ')).toBeFalse();
    });

    it('单字参照须在前后三字邻域内', () => {
      expect(evidenceSupports('重', 0, line, '阳')).toBeTrue();
      expect(evidenceSupports('重', 0, line, '酒')).toBeFalse();
    });

    it('词证只写被证字本身不算', () => {
      expect(evidenceSupports('重', 0, line, '重')).toBeFalse();
    });
  });

  describe('evaluateAdjudication 前后文复核', () => {
    const line = '重阳独酌杯中酒';

    it('字位一致且词证对得上，维持已定', () => {
      expect(evaluateAdjudication(adjudication(), '重', 0, line).status).toBe('confirmed');
    });

    it('换字后退回待核', () => {
      const result = evaluateAdjudication(adjudication(), '千', 0, line);
      expect(result.status).toBe('pending');
      expect(result.reviewReason).toContain('改字');
    });

    it('增删字导致移位，退回待核', () => {
      const result = evaluateAdjudication(adjudication(), '重', 1, '又重阳独酌酒');
      expect(result.status).toBe('pending');
      expect(result.reviewReason).toContain('移动');
    });

    it('词证与新前后文对不上，退回待核', () => {
      const result = evaluateAdjudication(adjudication({ evidence: '轻重' }), '重', 0, line);
      expect(result.status).toBe('pending');
      expect(result.reviewReason).toContain('对不上');
    });

    it('缺词证只能待核', () => {
      const result = evaluateAdjudication(adjudication({ evidence: '' }), '重', 0, line);
      expect(result.status).toBe('pending');
    });

    it('恢复词证后重新核对可回到已定', () => {
      const dropped = adjudication({ evidence: '轻重', status: 'pending' });
      const restored = { ...dropped, evidence: '重阳' };
      expect(evaluateAdjudication(restored, '重', 0, line).status).toBe('confirmed');
    });
  });
});
