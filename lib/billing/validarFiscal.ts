// Validación de datos fiscales del receptor (CFDI 4.0) ANTES de mandarlos
// al PAC: lo que se puede revisar sin consultar al SAT. Que el RFC exista
// y coincida con nombre/CP solo lo sabe el SAT; eso lo dice Facturapi al
// timbrar y su mensaje se le enseña al dueño tal cual.

export type DatosFiscales = {
  rfc: string;
  razon_social: string;
  regimen: string;
  codigo_postal: string;
  uso_cfdi: string;
};

// Catálogo c_RegimenFiscal del SAT, por tipo de persona que lo puede tener.
const REGIMEN_FISICA = ['605', '606', '607', '608', '610', '611', '612', '614', '615', '616', '621', '625', '626'];
const REGIMEN_MORAL = ['601', '603', '610', '620', '622', '623', '624', '626'];

// c_UsoCFDI. Las deducciones personales (D01–D10) solo aplican a personas físicas.
const USOS = ['G01', 'G02', 'G03', 'I01', 'I02', 'I03', 'I04', 'I05', 'I06', 'I07', 'I08', 'S01', 'CP01', 'CN01'];
const USOS_SOLO_FISICA = ['D01', 'D02', 'D03', 'D04', 'D05', 'D06', 'D07', 'D08', 'D09', 'D10'];

// 3 letras (moral) o 4 (física), fecha AAMMDD y homoclave de 3.
const RE_RFC = /^([A-ZÑ&]{3,4})(\d{2})(\d{2})(\d{2})([A-Z0-9]{3})$/;

export function normalizarRfc(rfc: string): string {
  return String(rfc ?? '').toUpperCase().replace(/[\s-]/g, '');
}

export function tipoPersona(rfc: string): 'fisica' | 'moral' | null {
  const m = RE_RFC.exec(normalizarRfc(rfc));
  if (!m) return null;
  const [, , , mes, dia] = m;
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;
  return m[1].length === 4 ? 'fisica' : 'moral';
}

/** Normaliza y devuelve la lista de problemas (vacía = válido). */
export function validarDatosFiscales(d: Partial<DatosFiscales>): { datos: DatosFiscales; errores: string[] } {
  const datos: DatosFiscales = {
    rfc: normalizarRfc(d.rfc ?? ''),
    // CFDI 4.0 pide la razón social tal cual la constancia, en mayúsculas y sin el régimen societario.
    razon_social: String(d.razon_social ?? '').trim().toUpperCase().replace(/\s+/g, ' '),
    regimen: String(d.regimen ?? '').trim().slice(0, 3),
    codigo_postal: String(d.codigo_postal ?? '').replace(/\D/g, ''),
    uso_cfdi: String(d.uso_cfdi ?? '').trim().toUpperCase(),
  };
  const errores: string[] = [];
  const persona = tipoPersona(datos.rfc);
  if (!persona) errores.push('El RFC no tiene un formato válido (12 caracteres para empresa, 13 para persona).');
  if (datos.razon_social.length < 2 || datos.razon_social.length > 300) errores.push('Falta la razón social o el nombre como aparece en la constancia.');
  if (!/^\d{5}$/.test(datos.codigo_postal)) errores.push('El código postal fiscal debe tener 5 dígitos.');
  const regimenes = persona === 'fisica' ? REGIMEN_FISICA : persona === 'moral' ? REGIMEN_MORAL : [...REGIMEN_FISICA, ...REGIMEN_MORAL];
  if (!regimenes.includes(datos.regimen)) errores.push('El régimen fiscal no corresponde al tipo de RFC o no existe en el catálogo del SAT.');
  const usos = persona === 'moral' ? USOS : [...USOS, ...USOS_SOLO_FISICA];
  if (!usos.includes(datos.uso_cfdi)) errores.push('El uso de CFDI no es válido para este RFC.');
  return { datos, errores };
}
