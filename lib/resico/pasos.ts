// Los pasos del checklist "¿Cómo me formalizo?" (db/051, mismos ids que
// el check de resico_checklist.paso). Fuentes verificadas el 11 nov 2026:
//   · LISR art. 113-E a 113-J — https://www.diputados.gob.mx/LeyesBiblio/pdf/LISR.pdf
//   · Inscripción al RFC (presencial, con cita) — https://wwwmat.sat.gob.mx/tramites/82714/realiza-tu-inscripcion-en-el-rfc-persona-fisica
//   · e.firma (cita, USB, identificación, correo, CURP; gratis) — https://wwwmat.sat.gob.mx/tramites/16703/obten-tu-certificado-de-e.firma
//   · CSD (Certifica + CertiSAT Web con e.firma; gratis) — https://wwwmat.sat.gob.mx/tramites/17507/envia-la-solicitud-para-tu-certificado-de-sello-digital-para-emitir-facturas-electronicas

export const PASOS_RESICO = [
  {
    id: 'rfc',
    hecho: 'Ya tengo RFC',
    titulo: 'Inscríbete al RFC',
    texto:
      'Agenda una cita en citas.sat.gob.mx y ve a la oficina del SAT. Lleva tu CURP, una identificación oficial vigente y un comprobante de domicilio. Te toca hacerlo a más tardar el mes siguiente a que empezaste a vender.',
  },
  {
    id: 'efirma',
    hecho: 'Ya tengo e.firma',
    titulo: 'Saca tu e.firma',
    texto:
      'En la misma cita puedes sacarla: lleva una memoria USB (de preferencia nueva) y un correo al que tengas acceso. Te toman foto, huellas y firma. Es gratis. La necesitas para casi todo lo demás.',
  },
  {
    id: 'buzon',
    hecho: 'Ya activé mi buzón tributario',
    titulo: 'Activa tu buzón tributario',
    texto:
      'Es el "correo" por donde el SAT te avisa cosas. En RESICO es obligatorio tenerlo activo. Se activa en sat.gob.mx.',
  },
  {
    id: 'regimen',
    hecho: 'Ya estoy en RESICO',
    titulo: 'Confirma que estás en RESICO',
    texto:
      'Al inscribirte, pide que te den de alta en el Régimen Simplificado de Confianza. Revisa tu Constancia de Situación Fiscal: ahí dice tu régimen. Si ya estabas en otro, cambiarte tiene fechas y requisitos: confírmalos con el SAT o con un contador.',
  },
  {
    id: 'csd',
    hecho: 'Ya tengo sello digital (CSD)',
    titulo: 'Tramita tu sello digital (CSD)',
    texto:
      'Es lo que te deja hacer facturas. Se pide en línea con tu e.firma (programa Certifica y luego CertiSAT Web). Es gratis.',
  },
  {
    id: 'declaracion',
    hecho: 'Ya presenté mi primera declaración mensual',
    titulo: 'Presenta tu declaración cada mes',
    texto:
      'Cada mes, a más tardar el día 17 del mes siguiente, declaras lo que cobraste con factura y pagas el ISR. En abril presentas la declaración anual.',
  },
] as const;

export type PasoResico = (typeof PASOS_RESICO)[number]['id'];
