import { readFile } from 'node:fs/promises';

const REQUIRED_HEADERS = [
  'No',
  'Question',
  'Answer A',
  'Answer B',
  'Answer C',
  'Answer D',
  'Correct Answer',
  'Explanation',
];

const OPTIONAL_HEADERS = ['Image_URL', 'Hint', 'Details for Answer A', 'Details for Answer B', 'Details for Answer C', 'Details for Answer D'];

function parseCsvRow(content) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      fields.push(field);
      field = '';
      continue;
    }

    field += char;
  }

  fields.push(field);
  return fields;
}

function buildLogicalRows(content) {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const header = lines.shift();
  const rows = [];
  let current = '';

  for (const line of lines) {
    if (/^\d+,/.test(line)) {
      if (current) {
        rows.push(current);
      }
      current = line;
      continue;
    }

    if (!current) {
      continue;
    }

    current += `\n${line}`;
  }

  if (current) {
    rows.push(current);
  }

  return { header, rows };
}

function normalizeHeader(header) {
  return header.trim();
}

function normalizeQuestion(headers, row, sequenceNumber) {
  const item = Object.fromEntries(headers.map((header, index) => [header, (row[index] ?? '').trim()]));
  return {
    sourceNumber: Number(item.No) || sequenceNumber,
    questionNumber: sequenceNumber,
    prompt: item.Question,
    optionA: item['Answer A'],
    optionB: item['Answer B'],
    optionC: item['Answer C'],
    optionD: item['Answer D'],
    correctOption: (item['Correct Answer'] || '').toUpperCase(),
    hint: item.Hint,
    explanation: item.Explanation,
    detailA: item['Details for Answer A'],
    detailB: item['Details for Answer B'],
    detailC: item['Details for Answer C'],
    detailD: item['Details for Answer D'],
    imageUrl: item.Image_URL,
  };
}

function getValidationError(question) {
  if (!question.prompt || !question.optionA || !question.optionB || !question.optionC || !question.optionD) {
    return 'missing prompt or answer choice';
  }
  if (!['A', 'B', 'C', 'D'].includes(question.correctOption)) {
    return 'invalid correct option';
  }
  if (!question.explanation) {
    return 'missing explanation';
  }
  return null;
}

export async function parseCsvFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  const { header, rows } = buildLogicalRows(content);
  if (!header) {
    throw new Error('CSV file is empty.');
  }

  const headers = parseCsvRow(header).map(normalizeHeader);
  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`Missing required column: ${requiredHeader}`);
    }
  }

  const questions = [];
  const skippedRows = [];

  for (const row of rows) {
    const candidate = normalizeQuestion(headers, parseCsvRow(row), questions.length + 1);
    const error = getValidationError(candidate);
    if (error) {
      skippedRows.push({ sourceNumber: candidate.sourceNumber, reason: error });
      continue;
    }
    candidate.questionNumber = questions.length + 1;
    questions.push(candidate);
  }

  if (questions.length === 0) {
    throw new Error('No valid questions were found in the CSV file.');
  }

  return {
    questions,
    skippedRows,
    totalRows: rows.length,
  };
}
