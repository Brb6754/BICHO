import { describe, expect, it } from 'vitest';
import { conAnticipo, conAnticiposDemo, etiquetaAnticipo, leerFormAnticipo, leerPesos, textoVence } from './anticiposPanel';

const fd = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.append(k, v);
  return f;
};
const base = { activado: '1', monto_general: '150', apartado_min: '15', reagendar_horas: '24', politica: '' };

describe('leerPesos', () => {
  it('acepta lo que la gente teclea', () => {
    expect(leerPesos('150')).toBe(150);
    expect(leerPesos(' $1,500 ')).toBe(1500);
    expect(leerPesos('0')).toBe(0);
    expect(leerPesos('')).toBeNull();
  });
  it('rechaza centavos, negativos y montos absurdos', () => {
    expect(leerPesos('150.50')).toBeUndefined();
    expect(leerPesos('-5')).toBeUndefined();
    expect(leerPesos('abc')).toBeUndefined();
    expect(leerPesos('100001')).toBeUndefined();
  });
});

describe('leerFormAnticipo', () => {
  it('lee el formulario completo, con vacío = usa el general y 0 = sin anticipo', () => {
    const r = leerFormAnticipo(fd({ ...base, politica: '  Se reembolsa con 24 h  ', 'servicio:a': '', 'servicio:b': '0', 'servicio:c': '300' }));
    expect(r).toEqual({
      ok: true,
      valor: {
        activado: true,
        montoGeneralMxn: 150,
        minutosApartado: 15,
        plazoReagendarHoras: 24,
        politica: 'Se reembolsa con 24 h',
        instrucciones: null,
        porServicio: [
          { id: 'a', depositMxn: null },
          { id: 'b', depositMxn: 0 },
          { id: 'c', depositMxn: 300 },
        ],
      },
    });
  });

  it('valida los rangos del apartado y del plazo', () => {
    expect(leerFormAnticipo(fd({ ...base, apartado_min: '4' })).ok).toBe(false);
    expect(leerFormAnticipo(fd({ ...base, apartado_min: '121' })).ok).toBe(false);
    expect(leerFormAnticipo(fd({ ...base, apartado_min: '120' })).ok).toBe(true);
    expect(leerFormAnticipo(fd({ ...base, reagendar_horas: '721' })).ok).toBe(false);
    expect(leerFormAnticipo(fd({ ...base, reagendar_horas: '0' })).ok).toBe(true);
  });

  it('no deja prenderlo sin ningún monto', () => {
    const r = leerFormAnticipo(fd({ ...base, monto_general: '', 'servicio:a': '0' }));
    expect(r).toMatchObject({ ok: false });
    // Con un servicio que sí cobra, basta.
    expect(leerFormAnticipo(fd({ ...base, monto_general: '', 'servicio:a': '100' })).ok).toBe(true);
    // Apagado se guarda aunque no haya montos.
    expect(leerFormAnticipo(fd({ ...base, activado: '0', monto_general: '' })).ok).toBe(true);
  });

  it('rechaza un monto de servicio inválido y una política larga', () => {
    expect(leerFormAnticipo(fd({ ...base, 'servicio:a': '12.5' })).ok).toBe(false);
    expect(leerFormAnticipo(fd({ ...base, politica: 'x'.repeat(501) })).ok).toBe(false);
  });

  it('lee «Cómo te pagan» (db/062) y rechaza más de 500 letras', () => {
    const r = leerFormAnticipo(fd({ ...base, instrucciones: '  CLABE 0123 a nombre de Ana  ' }));
    expect(r).toMatchObject({ ok: true, valor: { instrucciones: 'CLABE 0123 a nombre de Ana' } });
    expect(leerFormAnticipo(fd({ ...base, instrucciones: 'x'.repeat(501) })).ok).toBe(false);
  });
});

describe('etiquetaAnticipo', () => {
  const tz = 'America/Mexico_City';
  it('pendiente con la hora local de vencimiento', () => {
    const e = etiquetaAnticipo({ status: 'confirmed', deposit_status: 'pending', hold_expires_at: '2026-11-18T22:30:00Z' }, tz);
    expect(e?.tono).toBe('pendiente');
    expect(e?.texto).toMatch(/^Falta anticipo · vence 16:30/);
  });
  it('pagado, y nada para citas sin anticipo o canceladas', () => {
    expect(etiquetaAnticipo({ status: 'confirmed', deposit_status: 'paid' }, tz)).toEqual({ texto: 'Anticipo pagado', tono: 'pagado' });
    expect(etiquetaAnticipo({ status: 'confirmed' }, tz)).toBeNull();
    expect(etiquetaAnticipo({ status: 'cancelled', deposit_status: 'released' }, tz)).toBeNull();
  });
});

describe('conAnticipo', () => {
  it('pega el estado por id y deja igual lo que no viene', () => {
    const citas = [{ id: '1', status: 'confirmed' }, { id: '2', status: 'confirmed' }];
    expect(conAnticipo(citas, null)).toBe(citas);
    expect(conAnticipo(citas, [{ id: '2', deposit_status: 'paid', hold_expires_at: null }])).toEqual([
      { id: '1', status: 'confirmed' },
      { id: '2', status: 'confirmed', deposit_status: 'paid', hold_expires_at: null, deposit_mxn: null },
    ]);
  });
});

describe('textoVence', () => {
  const tz = 'America/Mexico_City';
  const ahora = new Date('2026-11-18T22:00:00Z'); // 16:00 local
  it('dice a qué hora se libera y en cuánto', () => {
    expect(textoVence('2026-11-18T22:12:00Z', ahora, tz)).toBe('Se libera a las 16:12 (en 12 min)');
    expect(textoVence('2026-11-18T23:35:00Z', ahora, tz)).toBe('Se libera a las 17:35 (en 1 h 35 min)');
  });
  it('vencido sin barrer, o sin reloj', () => {
    expect(textoVence('2026-11-18T21:59:00Z', ahora, tz)).toMatch(/^Ya se venció/);
    expect(textoVence(null, ahora, tz)).toBe('Esperando el anticipo');
  });
});

describe('conAnticiposDemo', () => {
  it('aparta las dos siguientes confirmadas y marca pagada la tercera; no toca pasadas ni canceladas', () => {
    const ahora = new Date('2026-11-18T18:00:00Z');
    const citas = [
      { id: 'pasada', status: 'confirmed', starts_at: '2026-11-18T15:00:00Z' },
      { id: 'c', status: 'confirmed', starts_at: '2026-11-19T17:00:00Z' },
      { id: 'cancelada', status: 'cancelled', starts_at: '2026-11-18T19:00:00Z' },
      { id: 'a', status: 'confirmed', starts_at: '2026-11-18T19:00:00Z' },
      { id: 'b', status: 'confirmed', starts_at: '2026-11-18T20:00:00Z' },
    ];
    const por = Object.fromEntries(conAnticiposDemo(citas, ahora).map((c) => [c.id, c.deposit_status]));
    expect(por).toEqual({ pasada: undefined, c: 'paid', cancelada: undefined, a: 'pending', b: 'pending' });
  });
});
