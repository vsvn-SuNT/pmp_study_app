import { query, closePool } from './src/db/connection.js';

async function checkSchema() {
  try {
    // Check if image_url column exists and has data
    const result = await query(
      `SELECT COUNT(*) as total, COUNT(image_url) as with_image_url 
       FROM questions 
       LIMIT 1`
    );
    console.log('Questions table check:');
    console.log(result.rows[0]);
    
    // Show a sample question
    const sample = await query(
      `SELECT id, prompt, image_url 
       FROM questions 
       LIMIT 1`
    );
    console.log('\nSample question:');
    console.log(sample.rows[0]);
    
    await closePool();
  } catch (error) {
    console.error('Error:', error.message);
    process.exitCode = 1;
  }
}

checkSchema();
