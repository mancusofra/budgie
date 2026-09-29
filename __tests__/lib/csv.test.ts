import { transactionsCsv } from '@/features/settings/csv-export';
import { toCsv } from '@/lib/csv';

describe('toCsv', () => {
  it('mette tra virgolette solo le celle che servono, con BOM e CRLF', () => {
    expect(toCsv([['a', 'b;c', 'say "hi"', 'x\ny']], ';')).toBe('﻿a;"b;c";"say ""hi""";"x\ny"\r\n');
    expect(toCsv([['1,5', 'ok']], ',')).toBe('﻿"1,5",ok\r\n');
  });
});

describe('transactionsCsv', () => {
  const labels = {
    headers: ['Data', 'Tipo', 'Categoria', 'Conto', 'Verso', 'Importo', 'Valuta', 'Nota'] as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ],
    types: { expense: 'Spesa', income: 'Entrata', transfer: 'Trasferimento' },
  };
  const rows = [
    {
      transaction: {
        date: new Date(2026, 8, 3, 12),
        type: 'expense' as const,
        amount: 1250,
        note: 'pizza; birra',
      },
      category: { name: 'Cibo' },
      account: { name: 'Contanti', currency: 'EUR' },
      toAccount: null,
    },
    {
      transaction: {
        date: new Date(2026, 8, 4),
        type: 'transfer' as const,
        amount: 1000,
        note: null,
      },
      category: null,
      account: { name: 'Banca', currency: 'EUR' },
      toAccount: { name: 'Contanti' },
    },
  ];

  it('formato italiano: separatore ; e virgola decimale, spese negative', () => {
    expect(transactionsCsv(rows, labels, ',')).toBe(
      '﻿Data;Tipo;Categoria;Conto;Verso;Importo;Valuta;Nota\r\n' +
        '2026-09-03;Spesa;Cibo;Contanti;;-12,50;EUR;"pizza; birra"\r\n' +
        '2026-09-04;Trasferimento;;Banca;Contanti;10,00;EUR;\r\n',
    );
  });

  it('formato inglese: separatore , e punto decimale', () => {
    expect(transactionsCsv(rows.slice(0, 1), labels, '.').split('\r\n')[1]).toBe(
      '2026-09-03,Spesa,Cibo,Contanti,,-12.50,EUR,pizza; birra',
    );
  });
});
