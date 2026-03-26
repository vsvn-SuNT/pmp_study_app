#!/usr/bin/env python3
"""Script to add Image_URL column after Question column in all CSV files."""

import csv
import os
from pathlib import Path

def add_image_url_column(csv_file_path):
    """Add Image_URL column after Question column in a CSV file."""
    
    # Read the CSV file
    rows = []
    headers = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)  # Read header row
        rows = list(reader)  # Read data rows
    
    # Find the index of the Question column
    if 'Question' not in headers:
        print(f"❌ 'Question' column not found in {csv_file_path}")
        return False
    
    question_index = headers.index('Question')
    
    # Check if Image_URL column already exists
    if 'Image_URL' in headers:
        print(f"⚠️  'Image_URL' column already exists in {csv_file_path}")
        return True
    
    # Insert Image_URL column after Question
    headers.insert(question_index + 1, 'Image_URL')
    
    # Insert empty values for Image_URL in all rows
    for row in rows:
        row.insert(question_index + 1, '')  # Empty value for Image_URL
    
    # Write the updated CSV file
    with open(csv_file_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)
    
    print(f"✅ Added Image_URL column to {os.path.basename(csv_file_path)}")
    return True

def main():
    """Main function to process all CSV files in the csv directory."""
    csv_dir = Path(__file__).parent / 'csv'
    
    if not csv_dir.exists():
        print(f"❌ Directory {csv_dir} does not exist")
        return
    
    # Find all CSV files
    csv_files = sorted(csv_dir.glob('*.csv'))
    
    if not csv_files:
        print(f"❌ No CSV files found in {csv_dir}")
        return
    
    print(f"Found {len(csv_files)} CSV files\n")
    
    success_count = 0
    for csv_file in csv_files:
        if add_image_url_column(str(csv_file)):
            success_count += 1
    
    print(f"\n✅ Successfully processed {success_count}/{len(csv_files)} files")

if __name__ == '__main__':
    main()
