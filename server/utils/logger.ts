import pino from 'pino'

const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
})

export function createLogger(context: string) {
  return logger.child({ context })
}

export default logger
