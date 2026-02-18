import mammoth from 'mammoth'
import ExcelJS from 'exceljs'
import { createLogger } from './logger'

const logger = createLogger('document-parser')

// Lazy load pdf parser
let pdfParserModule: any = null
async function getPdfParser() {
  if (!pdfParserModule) {
    pdfParserModule = await import('./pdf-parser.mjs')
  }
  return pdfParserModule.default
}

export async function extractTextFromFile(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  try {
    // Plain text files
    if (mimeType === 'text/plain' || filename.endsWith('.txt')) {
      return file.toString('utf-8')
    }

    // PDF files
    if (mimeType === 'application/pdf' || filename.endsWith('.pdf')) {
      try {
        const pdfParse = await getPdfParser()

        // Parse with options to reduce memory usage
        const data = await pdfParse(file, {
          max: 0, // Parse all pages (0 = no limit)
          version: 'v2.0.550' // Use specific pdf.js version
        })

        if (!data.text || data.text.trim().length === 0) {
          throw new Error('PDF contains no extractable text. It may be a scanned image or image-based PDF.')
        }

        // Limit text size to prevent memory issues
        const maxChars = 500000 // 500k chars (~100 pages)
        if (data.text.length > maxChars) {
          logger.warn({ filename, originalLength: data.text.length }, 'PDF text truncated due to size')
          return data.text.slice(0, maxChars) + '\n\n[Document truncated due to size limit]'
        }

        return data.text
      } catch (pdfError) {
        const err = pdfError as Error
        logger.error({ error: err.message, filename }, 'PDF parsing failed')

        // Check if it's an OOM error
        if (err.message?.includes('heap') || err.message?.includes('memory')) {
          throw new Error('PDF is too large to process. Please split into smaller files or convert to .txt format.')
        }

        throw new Error(`Failed to parse PDF: ${err.message}. Try converting to .txt or .docx first.`)
      }
    }

    // DOCX files
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filename.endsWith('.docx')
    ) {
      const result = await mammoth.extractRawText({ buffer: file })
      return result.value
    }

    // Excel files (.xlsx)
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      filename.endsWith('.xlsx')
    ) {
      return await extractFromExcel(file)
    }

    // CSV files
    if (mimeType === 'text/csv' || filename.endsWith('.csv')) {
      return file.toString('utf-8')
    }

    // Old Excel format (.xls) - not supported by exceljs, ask user to convert
    if (mimeType === 'application/vnd.ms-excel' || filename.endsWith('.xls')) {
      throw new Error('Old Excel format (.xls) is not supported. Please convert the file to .xlsx format and try again.')
    }

    // Fallback: try to parse as text
    logger.warn({ filename, mimeType }, 'Unknown file type, attempting text extraction')
    return file.toString('utf-8')
  } catch (error) {
    const err = error as Error
    logger.error({ error: err.message || err, filename, mimeType }, 'Failed to extract text from file')

    // Re-throw with better message
    if (err.message) {
      throw err
    }
    throw new Error(`Failed to parse ${filename}. The file may be corrupted or in an unsupported format.`)
  }
}

async function extractFromExcel(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer)
  const texts: string[] = []

  workbook.worksheets.forEach(sheet => {
    const rows: string[] = []
    sheet.eachRow(row => {
      const values = Array.isArray(row.values) ? row.values.slice(1) : []
      rows.push(values.map(c => (c != null ? String(c) : '')).join(','))
    })
    texts.push(`Sheet: ${sheet.name}\n${rows.join('\n')}`)
  })

  return texts.join('\n\n')
}

export function validateFileSize(size: number, maxSizeMB = 10): void {
  const maxBytes = maxSizeMB * 1024 * 1024
  if (size > maxBytes) {
    throw new Error(`File size exceeds ${maxSizeMB}MB limit`)
  }
}

export function validateFileType(mimeType: string, filename: string): void {
  const allowedTypes = [
    'text/plain',
    'text/csv',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]

  const allowedExtensions = ['.txt', '.csv', '.pdf', '.docx', '.xlsx']

  const isValidType = allowedTypes.includes(mimeType)
  const isValidExtension = allowedExtensions.some(ext => filename.toLowerCase().endsWith(ext))

  if (!isValidType && !isValidExtension) {
    throw new Error('File type not supported. Please upload .txt, .csv, .pdf, .docx, .xlsx, or .xls files.')
  }
}
