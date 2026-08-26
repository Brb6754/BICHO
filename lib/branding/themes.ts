import type { FontKey } from './fonts';

export type ThemeKey = 'minimal' | 'modern' | 'luxury' | 'corporate' | 'bold' | 'soft';

export type ThemePreset = {
  label: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_heading: FontKey;
  font_body: FontKey;
};

// Quick-fill starting points, not enforced afterwards — a tenant (well,
// our internal team on their behalf, per the current access decision)
// picks one and can still override any individual color/font.
export const THEME_PRESETS: Record<ThemeKey, ThemePreset> = {
  minimal: {
    label: 'Minimal',
    primary_color: '#1A1A1A',
    secondary_color: '#333333',
    accent_color: '#1A1A1A',
    background_color: '#FFFFFF',
    text_color: '#1A1A1A',
    font_heading: 'inter',
    font_body: 'inter',
  },
  modern: {
    label: 'Modern',
    primary_color: '#0E3B2C',
    secondary_color: '#0A2E22',
    accent_color: '#8FE24A',
    background_color: '#F7F6F3',
    text_color: '#1A1A1A',
    font_heading: 'inter',
    font_body: 'inter',
  },
  luxury: {
    label: 'Luxury',
    primary_color: '#2B2118',
    secondary_color: '#1A140F',
    accent_color: '#C9A24B',
    background_color: '#FAF7F2',
    text_color: '#2B2118',
    font_heading: 'playfair',
    font_body: 'inter',
  },
  corporate: {
    label: 'Corporate',
    primary_color: '#0B3D91',
    secondary_color: '#082B66',
    accent_color: '#2F80ED',
    background_color: '#F5F7FA',
    text_color: '#1A1A1A',
    font_heading: 'merriweather',
    font_body: 'inter',
  },
  bold: {
    label: 'Bold',
    primary_color: '#000000',
    secondary_color: '#1A1A1A',
    accent_color: '#FFD400',
    background_color: '#FFFFFF',
    text_color: '#000000',
    font_heading: 'poppins',
    font_body: 'poppins',
  },
  soft: {
    label: 'Soft',
    primary_color: '#7C6A93',
    secondary_color: '#5F4E77',
    accent_color: '#F4B6C2',
    background_color: '#FBF7FA',
    text_color: '#3A2E44',
    font_heading: 'poppins',
    font_body: 'inter',
  },
};
