import { describe, expect, it } from 'vitest';
import { LOGO_MAX_BYTES, isHexColor, logoFileError, sniffImageType } from './logoUpload';

describe('logoFileError', () => {
  it('acepta jpg/png/webp de hasta 2 MB', () => {
    expect(logoFileError({ size: 1000, type: 'image/png' })).toBeNull();
    expect(logoFileError({ size: LOGO_MAX_BYTES, type: 'image/jpeg' })).toBeNull();
    expect(logoFileError({ size: 5, type: 'image/webp' })).toBeNull();
  });
  it('rechaza vacío, pesado u otro tipo', () => {
    expect(logoFileError({ size: 0, type: 'image/png' })).toMatch(/vacío/);
    expect(logoFileError({ size: LOGO_MAX_BYTES + 1, type: 'image/png' })).toMatch(/2 MB/);
    expect(logoFileError({ size: 10, type: 'image/svg+xml' })).toMatch(/JPG/);
    expect(logoFileError({ size: 10, type: 'image/gif' })).toMatch(/JPG/);
  });
});

describe('sniffImageType', () => {
  const bytes = (...v: (number | string)[]) =>
    new Uint8Array(v.flatMap((x) => (typeof x === 'string' ? [...x].map((c) => c.charCodeAt(0)) : [x])));
  it('reconoce los tres formatos por su firma', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg');
    expect(sniffImageType(bytes(0x89, 'PNG', 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe('image/png');
    expect(sniffImageType(bytes('RIFF', 0, 0, 0, 0, 'WEBP'))).toBe('image/webp');
  });
  it('rechaza un SVG o HTML disfrazado', () => {
    expect(sniffImageType(bytes('<svg xmlns='))).toBeNull();
    expect(sniffImageType(bytes('<html>'))).toBeNull();
    expect(sniffImageType(new Uint8Array())).toBeNull();
  });
});

describe('isHexColor', () => {
  it('solo #RRGGBB', () => {
    expect(isHexColor('#5B34E8')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(isHexColor('red')).toBe(false);
    expect(isHexColor('#5B34E8;background:url(x)')).toBe(false);
    expect(isHexColor(null)).toBe(false);
  });
});
