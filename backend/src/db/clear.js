import { query, closePool } from './connection.js';

async function clearDatabase() {
  try {
    console.log('Clearing sessions...');
    await query('DELETE FROM study_sessions');
    console.log('✓ Sessions cleared');
    
    console.log('Clearing questions...');
    await query('DELETE FROM questions');
    console.log('✓ Questions cleared');
    
    console.log('Clearing exam sets...');
    await query('DELETE FROM exam_sets');
    console.log('✓ Exam sets cleared');
    
    console.log('Database cleared successfully');
  } finally {
    await closePool();
  }
}

clearDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
