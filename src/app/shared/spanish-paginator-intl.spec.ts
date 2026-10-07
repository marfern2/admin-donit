import { SpanishPaginatorIntl } from './spanish-paginator-intl';

describe('SpanishPaginatorIntl', () => {
  const intl = new SpanishPaginatorIntl();

  it('uses Spanish accessible labels and correct ranges', () => {
    expect(intl.itemsPerPageLabel).toBe('Elementos por página:');
    expect(intl.nextPageLabel).toBe('Página siguiente');
    expect(intl.getRangeLabel(1, 20, 43)).toBe('21–40 de 43');
    expect(intl.getRangeLabel(0, 20, 0)).toBe('0 de 0');
  });
});
