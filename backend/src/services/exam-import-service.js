import path from 'node:path';
import { readdir } from 'node:fs/promises';
import { resolveProjectPath } from '../db/connection.js';
import { createExamSetRepository } from '../models/exam-set-repository.js';
import { createQuestionRepository } from '../models/question-repository.js';
import { parseCsvFile } from '../import/csv-importer.js';

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitle(slug) {
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function createExamImportService({
  examSetRepository = createExamSetRepository(),
  questionRepository = createQuestionRepository(),
} = {}) {
  return {
    async importFile(filePath, customExamName) {
      const { questions, skippedRows, totalRows } = await parseCsvFile(filePath);
      const fileName = path.basename(filePath);
      const baseSlug = slugify(path.basename(filePath, path.extname(filePath)));
      const slug = customExamName ? slugify(customExamName) : baseSlug;
      const title = customExamName || toTitle(baseSlug);
      
      const examSet = await examSetRepository.upsert({
        slug,
        title,
        sourceFileName: fileName,
        questionCount: questions.length,
        skippedRowCount: skippedRows.length,
        importSummary: skippedRows.length
          ? `${skippedRows.length} invalid row(s) skipped from ${totalRows} source row(s).`
          : `Imported ${questions.length} valid question(s) with no skipped rows.`,
        importStatus: questions.length > 0 ? 'ready' : 'invalid',
      });

      await questionRepository.replaceForExamSet(examSet.id, questions);
      return {
        ...examSet,
        questionCount: questions.length,
        skippedRowCount: skippedRows.length,
        skippedRows,
      };
    },

    async importDirectory(directoryPath = resolveProjectPath('csv')) {
      const entries = (await readdir(directoryPath)).filter((entry) => entry.endsWith('.csv')).sort();
      const imported = [];
      for (const entry of entries) {
        imported.push(await this.importFile(path.join(directoryPath, entry)));
      }
      return imported;
    },
  };
}
