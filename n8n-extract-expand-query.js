const trigger = $('Execute Workflow Trigger').first().json;

// Extrai query — suporta string direta ou objeto com campo interno
let query = trigger.query || trigger.message || trigger.input || trigger.text || trigger.content || '';

if (typeof query === 'object' && query !== null) {
  query = query.text || query.content || query.message || query.query || query.input || '';
}

query = String(query || '').trim();

if (!query) {
  throw new Error('Query vazia. Trigger recebido: ' + JSON.stringify(trigger));
}

// agentId vem do trigger; fallback para o id da linha do banco (Select rows from a table)
const agentId = trigger.agentId || $input.first().json.id || null;

// EXPANSÃO DE QUERY COM SINÔNIMOS PT->EN
const expansions = {
  'espaço': 'space distance area required',
  'dimensão': 'dimension size measurement',
  'dimensões': 'dimensions size measurements',
  'tamanho': 'size dimension',
  'distância': 'distance spacing required',
  'instalação': 'installation setup required space',
  'espaço necessário': 'required space distance needed',
  'medidas': 'measurements dimensions size',
  'treinar': 'training workout exercise',
  'equipamento': 'equipment device station',
  'aparelho': 'device equipment station',
  'funciona': 'works functions operates',
  'como usar': 'how to use operation',
  'preço': 'price cost pricing',
  'características': 'features characteristics specifications'
};

let expandedQuery = query;
const lowerQuery = query.toLowerCase();
for (const [pt, en] of Object.entries(expansions)) {
  if (lowerQuery.includes(pt)) expandedQuery += ' ' + en;
}

const numbers = query.match(/\d+[.,]\d+/g);
if (numbers) expandedQuery += ' ' + numbers.join(' ');

console.log('📝 Query original:', query);
console.log('📝 Query expandida:', expandedQuery);

return [{
  json: {
    originalMessage: query,
    expandedMessage: expandedQuery,
    agentId,
    hasNumbers: !!numbers,
    detectedNumbers: numbers || []
  }
}];
