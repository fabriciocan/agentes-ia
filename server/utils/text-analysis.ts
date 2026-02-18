import { createLogger } from './logger'

const logger = createLogger('text-analysis')

/**
 * Extract important keywords from text
 * Focuses on technical terms, measurements, and domain-specific vocabulary
 */
export function extractKeywords(text: string): string[] {
  const keywords = new Set<string>()

  // Common technical and measurement patterns
  const patterns = [
    // Measurements and dimensions
    /\d+[.,]\d+\s*(m|cm|mm|km|ft|in|meters?|centimeters?|millimeters?)\b/gi,
    /\d+\s*x\s*\d+\s*(m|cm|mm|meters?|centimeters?)/gi,

    // Space and distance terms
    /required\s+space/gi,
    /minimum\s+space/gi,
    /distance\s+(between|from|to)/gi,
    /dimensions?/gi,
    /measurements?/gi,

    // Installation and setup terms
    /installation/gi,
    /setup/gi,
    /configuration/gi,
    /requirements?/gi,
    /specifications?/gi,

    // Technical terms
    /technical/gi,
    /equipment/gi,
    /device/gi,
    /system/gi,
    /platform/gi,

    // Portuguese specific
    /espaço\s+necessário/gi,
    /distância/gi,
    /dimensões/gi,
    /instalação/gi,
    /configuração/gi,
    /requisitos/gi,
    /especificações/gi,

    // German specific (for Pixformance)
    /platzbedarf/gi,
    /abstand/gi,
    /maße/gi,
    /installation/gi,
    /aufbau/gi,
    /anforderungen/gi,

    // Numbers with units (prices, percentages, etc.)
    /\d+\s*%/gi,
    /\$\d+/gi,
    /€\d+/gi,
    /R\$\s*\d+/gi
  ]

  // Extract matches from all patterns
  patterns.forEach(pattern => {
    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        // Normalize and add to set
        const normalized = match.toLowerCase().trim()
        if (normalized.length > 1) {
          keywords.add(normalized)
        }
      })
    }
  })

  // Extract important phrases (2-3 words)
  const phrasePattern = /\b([A-Z][a-z]+\s+(?:[A-Z][a-z]+\s+)?[A-Z][a-z]+)\b/g
  const phraseMatches = text.match(phrasePattern)
  if (phraseMatches) {
    phraseMatches.slice(0, 10).forEach(phrase => {
      keywords.add(phrase.toLowerCase())
    })
  }

  const result = Array.from(keywords)
  logger.debug({ count: result.length, sample: result.slice(0, 5) }, 'Keywords extracted')

  return result
}

/**
 * Detect the language of the text
 * Returns 'pt' for Portuguese, 'en' for English, 'de' for German, or 'unknown'
 */
export function detectLanguage(text: string): 'pt' | 'en' | 'de' | 'es' | 'unknown' {
  // Take a sample from the beginning and middle of the text
  const sampleSize = 500
  const firstSample = text.substring(0, sampleSize).toLowerCase()
  const middleSample = text
    .substring(Math.floor(text.length / 2), Math.floor(text.length / 2) + sampleSize)
    .toLowerCase()
  const sample = firstSample + ' ' + middleSample

  // Common words and patterns for each language
  const patterns = {
    pt: {
      words: ['o ', 'a ', 'de ', 'para ', 'com ', 'em ', 'os ', 'as ', 'do ', 'da ', 'no ', 'na ', 'por ', 'que ', 'não ', 'são ', 'está'],
      score: 0
    },
    en: {
      words: ['the ', 'and ', 'to ', 'for ', 'with ', 'in ', 'is ', 'are ', 'of ', 'that ', 'this ', 'from ', 'or ', 'not ', 'was ', 'were'],
      score: 0
    },
    de: {
      words: ['der ', 'die ', 'das ', 'und ', 'mit ', 'für ', 'von ', 'ist ', 'sind ', 'den ', 'dem ', 'des ', 'oder ', 'nicht ', 'ein ', 'eine'],
      score: 0
    },
    es: {
      words: ['el ', 'la ', 'de ', 'para ', 'con ', 'en ', 'los ', 'las ', 'del ', 'al ', 'por ', 'que ', 'no ', 'son ', 'está ', 'es '],
      score: 0
    }
  }

  // Count matches for each language
  Object.entries(patterns).forEach(([lang, data]) => {
    data.score = data.words.filter(word => sample.includes(word)).length
  })

  // Find language with highest score
  const entries = Object.entries(patterns) as Array<[keyof typeof patterns, typeof patterns[keyof typeof patterns]]>
  const maxScore = Math.max(...entries.map(([, data]) => data.score))

  if (maxScore === 0) {
    return 'unknown'
  }

  const detected = entries.find(([, data]) => data.score === maxScore)?.[0] || 'unknown'

  logger.debug(
    {
      detected,
      scores: {
        pt: patterns.pt.score,
        en: patterns.en.score,
        de: patterns.de.score,
        es: patterns.es.score
      }
    },
    'Language detected'
  )

  return detected as 'pt' | 'en' | 'de' | 'es' | 'unknown'
}

/**
 * Check if text contains numerical data (useful for technical documents)
 */
export function hasNumericalData(text: string): boolean {
  // Check for numbers followed by units, percentages, currency, etc.
  const numericalPatterns = [
    /\d+[.,]\d+/,
    /\d+\s*%/,
    /\$\d+/,
    /€\d+/,
    /R\$\s*\d+/,
    /\d+\s*(m|cm|mm|km|kg|g|l|ml)/i
  ]

  return numericalPatterns.some(pattern => pattern.test(text))
}

/**
 * Check if text contains table-like structures
 */
export function hasTableStructure(text: string): boolean {
  // Look for common table patterns
  const tablePatterns = [
    /\|.*\|.*\|/,  // Markdown tables
    /\t.*\t.*\t/,   // Tab-separated
    /\s{3,}\S+\s{3,}/  // Multiple spaces (column alignment)
  ]

  return tablePatterns.some(pattern => pattern.test(text))
}

/**
 * Estimate number of pages based on character count
 * Assumes ~3000 characters per page (standard A4 page)
 */
export function estimatePages(text: string): number {
  const charsPerPage = 3000
  return Math.ceil(text.length / charsPerPage)
}
