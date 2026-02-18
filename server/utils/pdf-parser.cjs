const pdfParse = require('pdf-parse');

module.exports = async function parsePDF(buffer) {
  return await pdfParse(buffer);
};
