// Módulo para categorizar artículos

// Categorías disponibles en el sistema
const categories = [
  'agricultura',
  'comunidad',
  'sostenibilidad',
  'politica-agraria',
  'tecnologia-rural',
  'cultura',
  'eventos',
  'noticias',
  'analisis',
  'investigacion',
  'internacional',
  'comunicados',
  'testimonios'
];

// Palabras clave por categoría
const categoryKeywords = {
  'agricultura': [
    'cultivo', 'semilla', 'cosecha', 'agroecología', 'producción', 
    'siembra', 'huerta', 'agrícola', 'orgánico', 'fertilizante',
    'plaga', 'riego', 'suelo', 'rotación', 'temporada'
  ],
  'comunidad': [
    'colectivo', 'organización', 'participación', 'social', 'comunitario',
    'cooperativa', 'asociación', 'solidaridad', 'encuentro', 'reunión',
    'asamblea', 'minga', 'trabajo comunitario', 'junta', 'liderazgo'
  ],
  'sostenibilidad': [
    'ecológico', 'ambiente', 'conservación', 'biodiversidad', 'sostenible',
    'cambio climático', 'reciclaje', 'energía renovable', 'huella ecológica',
    'recursos naturales', 'ecosistema', 'preservación', 'fauna', 'flora'
  ],
  'politica-agraria': [
    'reforma agraria', 'política', 'legislación', 'derechos', 'movimiento',
    'ley', 'tierra', 'territorio', 'tenencia', 'campesino', 'lucha',
    'reivindicación', 'resistencia', 'soberanía', 'gobierno'
  ],
  'tecnologia-rural': [
    'tecnología', 'innovación', 'herramienta', 'digital', 'aplicación',
    'sistema', 'automatización', 'maquinaria', 'equipamiento', 'software',
    'hardware', 'dispositivo', 'sensor', 'monitoreo', 'conectividad'
  ],
  'cultura': [
    'tradición', 'gastronomía', 'artesanía', 'ancestral', 'cultural',
    'identidad', 'patrimonio', 'ritual', 'celebración', 'fiesta',
    'música', 'danza', 'arte', 'costumbre', 'saberes'
  ],
  'eventos': [
    'feria', 'encuentro', 'capacitación', 'taller', 'seminario',
    'congreso', 'exposición', 'jornada', 'conferencia', 'curso',
    'inauguración', 'lanzamiento', 'convocatoria', 'festival', 'concurso'
  ],
  'noticias': [
    'actualidad', 'reciente', 'noticia', 'acontecimiento', 'suceso',
    'información', 'comunicado', 'boletín', 'novedad', 'última hora',
    'reportaje', 'cobertura', 'difusión', 'prensa', 'medios'
  ],
  'analisis': [
    'análisis', 'estudio', 'reflexión', 'crítica', 'perspectiva',
    'debate', 'discusión', 'opinión', 'evaluación', 'interpretación',
    'argumento', 'postura', 'enfoque', 'consideración', 'punto de vista'
  ],
  'investigacion': [
    'investigación', 'estudio', 'metodología', 'hallazgos', 'resultados',
    'datos', 'estadística', 'muestra', 'encuesta', 'entrevista',
    'observación', 'experimento', 'publicación', 'revista', 'académico'
  ],
  'internacional': [
    'internacional', 'global', 'mundial', 'extranjero', 'exterior',
    'cooperación', 'tratado', 'acuerdo', 'país', 'nación',
    'frontera', 'intercambio', 'diplomacia', 'relación', 'organismo'
  ],
  'comunicados': [
    'comunicado', 'pronunciamiento', 'declaración', 'manifiesto', 'posición',
    'denuncia', 'exigencia', 'petición', 'solicitud', 'rechazo',
    'apoyo', 'solidaridad', 'llamado', 'convocatoria', 'alerta'
  ],
  'testimonios': [
    'testimonio', 'experiencia', 'historia', 'relato', 'narración',
    'vivencia', 'memoria', 'recuerdo', 'anécdota', 'biografía',
    'entrevista', 'perfil', 'protagonista', 'voz', 'primera persona'
  ]
};

// Mapeo de etiquetas de Blogger a categorías
const tagMapping = {
  // Etiquetas originales del blog
  'Comunicados': 'comunicados',
  'Noticias': 'noticias',
  'Convocatorias': 'eventos',
  'Denuncias': 'comunicados',
  'Pronunciamientos': 'comunicados',
  'Declaraciones': 'comunicados',
  'Análisis': 'analisis',
  'Testimonios': 'testimonios',
  'Investigación': 'investigacion',
  'Internacional': 'internacional',
  
  // Categorías temáticas
  'Reforma Agraria': 'politica-agraria',
  'Territorio': 'politica-agraria',
  'Agroecología': 'agricultura',
  'Soberanía Alimentaria': 'agricultura',
  'Medio Ambiente': 'sostenibilidad',
  'Agua': 'sostenibilidad',
  'Minería': 'sostenibilidad',
  'Paz': 'politica-agraria',
  'Derechos Humanos': 'politica-agraria',
  'Juventud': 'comunidad',
  'Mujeres': 'comunidad',
  'Indígenas': 'cultura',
  'Afrocolombianos': 'cultura'
};

/**
 * Categoriza un artículo basado en su contenido y etiquetas
 * @param {Object} article Artículo a categorizar
 * @returns {string} Categoría asignada
 */
function categorizeArticle(article) {
  // 1. Intentar categorizar por etiquetas
  if (article.tags && article.tags.length > 0) {
    for (const tag of article.tags) {
      if (tagMapping[tag]) {
        return tagMapping[tag];
      }
    }
  }
  
  // 2. Categorizar por palabras clave en título y contenido
  const scores = {};
  
  // Inicializar puntuaciones
  for (const category of categories) {
    scores[category] = 0;
  }
  
  // Texto a analizar (título + contenido)
  const textToAnalyze = (article.title + ' ' + stripHtml(article.content)).toLowerCase();
  
  // Calcular puntuación para cada categoría
  for (const category of categories) {
    for (const keyword of categoryKeywords[category]) {
      const regex = new RegExp('\\b' + keyword.toLowerCase() + '\\b', 'g');
      const matches = textToAnalyze.match(regex);
      
      if (matches) {
        // Dar más peso a las palabras clave encontradas en el título
        const titleMatches = article.title.toLowerCase().match(regex);
        const titleScore = titleMatches ? titleMatches.length * 3 : 0;
        
        // Puntuación total
        scores[category] += matches.length + titleScore;
      }
    }
  }
  
  // 3. Encontrar la categoría con mayor puntuación
  let bestCategory = 'noticias'; // Categoría por defecto
  let maxScore = 0;
  
  for (const category in scores) {
    if (scores[category] > maxScore) {
      maxScore = scores[category];
      bestCategory = category;
    }
  }
  
  // Si no se encontró ninguna categoría clara, usar una por defecto
  if (maxScore === 0) {
    bestCategory = 'noticias';
  }
  
  return bestCategory;
}

/**
 * Elimina etiquetas HTML de un texto
 * @param {string} html Texto con etiquetas HTML
 * @returns {string} Texto sin etiquetas HTML
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = { categorizeArticle };
