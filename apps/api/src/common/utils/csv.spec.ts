import { csvCell, csvRow } from './csv';

describe('csv', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvCell('+91 98')).toBe("'+91 98");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });
  it('quotes separators and leaves plain values alone', () => {
    expect(csvRow(['a,b', 3, null, 'plain'])).toBe('"a,b",3,,plain');
  });
});
