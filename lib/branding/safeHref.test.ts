import { describe, it, expect } from 'vitest';
import { safeHref } from './safeHref';

describe('safeHref', () => {
  it('allows http/https URLs', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('http://example.com')).toBe('http://example.com');
  });

  it('allows mailto: and tel:', () => {
    expect(safeHref('mailto:hola@negocio.com')).toBe('mailto:hola@negocio.com');
    expect(safeHref('tel:+525512345678')).toBe('tel:+525512345678');
  });

  it('allows a scheme-less relative path or anchor', () => {
    expect(safeHref('/reservar')).toBe('/reservar');
    expect(safeHref('#contacto')).toBe('#contacto');
  });

  it('blocks javascript: URIs', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#');
    expect(safeHref('  javascript:alert(1)')).toBe('#');
    expect(safeHref('JavaScript:alert(1)')).toBe('#');
  });

  it('blocks data: URIs', () => {
    expect(safeHref('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('falls back to # for empty/missing values', () => {
    expect(safeHref('')).toBe('#');
    expect(safeHref(undefined)).toBe('#');
    expect(safeHref(null)).toBe('#');
  });
});
