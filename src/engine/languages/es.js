/* Spanish language pack. */

const RANKED = `de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mí antes algunos qué unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella estar estas algunas algo nosotros mi mis tú te ti tu tus ellas nosotras vosotros vosotras os mío mía míos mías tuyo tuya suyo suya nuestro nuestra nuestros nuestras vuestro vuestra esos esas
ser estar tener hacer poder decir ir ver dar saber querer llegar pasar deber poner parecer quedar creer hablar llevar dejar seguir encontrar llamar venir pensar salir volver tomar conocer vivir sentir tratar mirar contar empezar esperar buscar existir entrar trabajar escribir perder producir ocurrir entender pedir recibir recordar terminar permitir aparecer conseguir comenzar servir sacar necesitar mantener resultar leer caer cambiar presentar crear abrir considerar oír acabar convertir ganar formar traer partir morir aceptar realizar suponer comprender lograr explicar preguntar tocar reconocer estudiar alcanzar nacer dirigir correr utilizar pagar ayudar gustar jugar escuchar cumplir ofrecer descubrir levantar intentar usar decidir repetir olvidar valer comprar subir bajar notar mostrar indicar señalar aumentar reducir mejorar asegurar determinar identificar describir discutir aplicar comparar analizar revisar aprobar rechazar probar alegar acordar negar conceder ordenar presentar firmar enviar recibir obtener referir asignar asistir registrar devolver eliminar reemplazar revelar compartir almacenar probar rastrear entrenar tratar visitar esperar
año día tiempo vez casa hombre mujer parte vida momento forma caso mundo trabajo país lugar mano manera noche cosa punto tipo hora agua nombre pueblo mes semana grupo problema estado ciudad ejemplo persona gente niño familia gobierno programa sistema empresa servicio precio valor nivel número proceso resultado razón causa efecto cambio hecho cuestión pregunta respuesta idea palabra libro cuerpo cabeza ojo cara padre madre hijo hija amigo equipo miembro jugador juego escuela estudiante maestro calle coche carretera aire luz fuerza energía naturaleza salud mente corazón dinero mercado producto derecho ley
demandante demandado abogado testigo testimonio declaración moción alegato estatuto reglamento contrato cláusula responsabilidad daños perjuicios acuerdo reclamante sentencia apelación veredicto jurado audiencia prueba anexo declaración jurada citación descubrimiento negligencia lesión aseguradora póliza prima cobertura reclamación ajustador expediente historial tratamiento diagnóstico terapia recuperación accidente colisión vehículo conductor pasajero culpa honorarios anticipo cliente asunto despacho procurador
grande pequeño bueno malo nuevo viejo joven largo corto alto bajo mayor menor mejor peor primero último único mismo propio general específico común especial similar diferente varios varias solo entero completo lleno vacío claro oscuro fuerte débil duro suave fácil difícil simple complejo importante necesario posible imposible disponible razonable significativo relevante apropiado eficaz eficiente exitoso útil valioso serio grave crítico central principal secundario final inicial original actual reciente anterior futuro pasado presente próximo cierto probable verdadero falso real potencial local nacional público privado social político económico financiero legal médico técnico
modelo análisis método enfoque marco estructura función característica elemento factor variable medida métrica muestra población promedio mediana varianza desviación distribución patrón tendencia señal ruido umbral estimación probabilidad confianza intervalo correlación regresión agrupamiento clasificación exactitud precisión error sesgo referencia control experimento hipótesis conclusión resumen sección figura tabla apéndice cita
panorama ámbito profundizar navegar abanico plétora paradigma holístico robusto integral aprovechar utilizar facilitar optimizar mejorar fomentar cultivar emprender desbloquear liberar aprovechamiento intrincado matizado multifacético invaluable crucial vital primordial profundo notable destacable convincente cautivador fascinante intrigante testimonio piedra angular fundamental esencial`;

const V = "aeiouáéíóúüàèìòù";
const STRONG = "aeoáéóàè";
const WEAK = "iuüìò";
/** Vowel-group counting with Spanish diphthong and hiatus rules. */
function syllables(w) {
  const s = w.toLowerCase().replace(/[^a-záéíóúüñàèìòùç]/g, "");
  if (!s) return 0;
  let count = 0, i = 0;
  while (i < s.length) {
    if (!V.includes(s[i])) { i++; continue; }
    count++;
    let j = i;
    while (j + 1 < s.length && V.includes(s[j + 1])) {
      const a = s[j], b = s[j + 1];
      const hiatus =
        (STRONG.includes(a) && STRONG.includes(b)) ||
        "áéíóú".includes(b) && WEAK.includes(b.normalize("NFD")[0]);
      if ("íú".includes(b) || "íú".includes(a)) { break; }
      if (hiatus) break;
      j++;
    }
    i = j + 1;
  }
  return Math.max(1, count);
}

export default {
  code: "es",
  name: "Spanish",
  endonym: "Español",
  calibration: "secondary",
  ranked: RANKED,
  syllables,
  /** Fernández Huerta: the Spanish counterpart of Flesch. */
  readability: (words, sents, syll) => 206.84 - 60 * (syll / words) - 1.02 * (words / sents),
  readabilityName: "Fernández Huerta",
  // Spanish contractions (al, del) are grammatically mandatory, so they carry
  // no authorship signal at all. Held rather than measured.
  contractionRe: null,
  functionWords: `de la que el en y a los se del las un por con no una su para es al lo como más pero sus le ya o este sí porque esta entre cuando muy sin sobre también me hasta hay donde quien desde todo nos durante todos uno les ni contra otros ese eso ante ellos e esto mí antes algunos unos yo otro otras otra él tanto esa estos mucho quienes nada muchos cual poco ella mi mis tú te ti tu tus ellas os esos esas ser estar haber son era fue han ha había si aunque mientras pues según hacia tras cada cual cuyo cuya`,
  discourseMarkers: `sin embargo | además | por lo tanto | asimismo | no obstante | en consecuencia | por consiguiente | en primer lugar | en segundo lugar | en tercer lugar | finalmente | por último | en cambio | por otro lado | por ejemplo | es decir | de hecho | en conclusión | en resumen | en definitiva | mientras que | de este modo | así pues | cabe mencionar | cabe señalar | por otra parte | dicho esto | a su vez | en efecto`,
  registerMarkers: `en el mundo actual | en la era digital | es importante destacar | es importante señalar | es importante mencionar | cabe destacar | cabe señalar | vale la pena señalar | vale la pena mencionar | juega un papel fundamental | juega un papel crucial | desempeña un papel fundamental | desempeña un papel crucial | un abanico de | una amplia gama de | una plétora de | una miríada de | profundizar en | el panorama | en el ámbito de | en última instancia | es fundamental | es crucial | resulta crucial | resulta fundamental | no solo | sino también | enfoque holístico | marco robusto | aprovechar el poder | desbloquear el potencial | piedra angular | un testimonio de | en constante evolución | subraya la importancia | pone de relieve | arroja luz sobre | en su esencia | a la hora de | en conclusión | para concluir | en resumen | puntos clave | paso a paso | pros y contras | como modelo de lenguaje | espero que esto ayude | en este artículo`,
  hedges: `puede | podría | pueden | podrían | quizá | quizás | tal vez | posiblemente | probablemente | generalmente | en general | por lo general | a menudo | suele | suelen | tiende a | tienden a | aparentemente | al parecer | en cierta medida | relativamente | en algunos casos | ampliamente | a veces`,
  intensifiers: `muy | realmente | extremadamente | increíblemente | absolutamente | totalmente | sumamente | bastante | demasiado | tan | súper | enormemente | profundamente`,
  firstPerson: `yo me mí mi mis conmigo mío mía míos mías nosotros nosotras nos nuestro nuestra nuestros nuestras`,
  abbreviations: `sr sra srta dr dra lic ing arq prof mtro mtra don doña ud uds vd vds etc ej p.ej pág págs núm núms art arts cap caps fig figs vol vols ed eds tomo apdo dpto depto avda av cía s.a s.l s.r.l ltda inc a.m p.m ene feb mar abr may jun jul ago sep sept oct nov dic lun mar mié jue vie sáb dom a b c d e f g h i j k l m n o p q r s t u v w x y z`,
  // Spanish prose runs longer per sentence, drops subject pronouns, and leans
  // harder on prepositional chains than English. Bands shift accordingly.
  bands: {
    sentMean: { center: 24, spread: 7.5 },
    sentSd: { center: 11.0, spread: 4.0 },
    bandRate: { center: 0.30, spread: 0.11 },
    shortRate: { center: 0.13, spread: 0.08 },
    longRate: { center: 0.12, spread: 0.09 },
    funcRate: { center: 0.45, spread: 0.05 },
    firstPerson: { center: 9, spread: 8 },
    hedge: { center: 12, spread: 6 },
    discourse: { center: 8, spread: 4 },
    passive: { center: 0.11, spread: 0.07 },
    oovRate: { center: 0.32, spread: 0.10 },
    surpMean: { center: 10.9, spread: 1.2 },
    flesch: { center: 62, spread: 16 },
    emDash: { center: 2.4, spread: 2.2 },
  },
  holds: { contraction: "Spanish has no optional contractions to count" },
};
