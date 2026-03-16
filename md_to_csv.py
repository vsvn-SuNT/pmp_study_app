#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMP Markdown to CSV - Complete Rewrite
Simple, robust, tested version
"""

import re
import csv
from pathlib import Path


def main():
    """Main conversion"""
    
    print("\n" + "=" * 70)
    print("🎯 PMP MD → CSV Converter")
    print("=" * 70 + "\n")
    
    md_file = "PMP Exam Simulator 01 (1-200).md"
    csv_file = "PMP_Questions.csv"
    
    # Check file exists
    if not Path(md_file).exists():
        print(f"❌ File not found: {md_file}")
        return False
    
    print(f"📖 Reading: {md_file}")
    
    with open(md_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    print(f"✓ File size: {len(content):,} bytes\n")
    
    # Extract questions
    questions = []
    
    # Split by "Question X"
    parts = re.split(r'Question\s+(\d+)', content)
    
    print(f"Split into {len(parts)} parts\n")
    
    # parts[0] = prefix before Question 1
    # parts[1] = "1"
    # parts[2] = content of Q1
    # parts[3] = "2"
    # parts[4] = content of Q2
    # ... etc
    
    for i in range(1, len(parts), 2):
        if i + 1 >= len(parts):
            break
        
        q_num = parts[i].strip()
        q_content = parts[i + 1]
        
        # Parse this question
        q_data = parse_question(q_num, q_content)
        
        if q_data and q_data.get('Question'):
            questions.append(q_data)
            print(f"✓ Q{q_num}: {(q_data['Question'][:40] + '...')[:43]}")
    
    print(f"\n✅ Extracted {len(questions)} questions\n")
    
    if not questions:
        print("❌ No questions were extracted!")
        return False
    
    # Save to CSV
    print("💾 Saving to CSV...")
    save_to_csv(questions, csv_file)
    
    # Show first question
    print("\n📊 Sample (First Question):")
    print("─" * 70)
    q = questions[0]
    print(f"No: {q['No']}")
    print(f"Q:  {q['Question'][:80]}")
    print(f"A:  {q['Answer A'][:70] if q['Answer A'] else '(empty)'}")
    print(f"B:  {q['Answer B'][:70] if q['Answer B'] else '(empty)'}")
    print(f"C:  {q['Answer C'][:70] if q['Answer C'] else '(empty)'}")
    print(f"D:  {q['Answer D'][:70] if q['Answer D'] else '(empty)'}")
    print(f"✓:  {q['Correct Answer']}")
    
    print("\n" + "=" * 70)
    print("✨ Done!")
    print("=" * 70 + "\n")
    
    return True


def parse_question(q_num, content):
    """Parse a single question"""
    
    data = {
        'No': q_num,
        'Question': '',
        'Answer A': '',
        'Answer B': '',
        'Answer C': '',
        'Answer D': '',
        'Correct Answer': '',
        'Hint': '',
        'Explanation': '',
        'Details for Answer A': '',
        'Details for Answer B': '',
        'Details for Answer C': '',
        'Details for Answer D': ''
    }
    
    lines = content.split('\n')
    
    # ===== FIND SECTION BOUNDARIES =====
    # Find where answers start (- **A pattern)
    answer_start = 999
    for idx, line in enumerate(lines):
        if re.match(r'^\s*-\s+\*\*[A-D]\s+', line):
            answer_start = idx
            break
    
    # Find where correct answer line is (Answer: X)
    answer_end = len(lines)
    for idx, line in enumerate(lines):
        if re.match(r'^\s*Answer\s*:\s*[A-D]', line, re.IGNORECASE):
            answer_end = idx
            break
    
    # ===== QUESTION TEXT =====
    # Collect question lines (everything before answers)
    q_text = []
    for line in lines[:answer_start]:
        s = line.strip()
        # Skip empty, skip markdown headers, skip separators
        if s and not s.startswith('**') and not s.startswith('---'):
            q_text.append(s)
    
    data['Question'] = ' '.join(q_text).strip()
    
    # ===== ANSWERS A, B, C, D =====
    # ONLY look between answer_start and answer_end to avoid picking up details section
    for line in lines[answer_start:answer_end]:
        s = line.strip()
        
        # Pattern: - **A Something** or - **A Something (no closing **)
        match = re.match(r'^\s*-\s+\*\*([A-D])\s+(.+?)(?:\*\*)?$', s)
        if match:
            letter = match.group(1)
            answer = match.group(2).strip()
            # Remove trailing ** if present
            answer = re.sub(r'\*\*\s*$', '', answer)
            data[f'Answer {letter}'] = answer
    
    # ===== CORRECT ANSWER =====
    for line in lines:
        match = re.match(r'^\s*Answer\s*:\s*([A-D])', line, re.IGNORECASE)
        if match:
            data['Correct Answer'] = match.group(1)
            break
    
    # ===== HINT =====
    hint_match = re.search(
        r'\*\*Hint:\*\*\s*([\s\S]*?)\n\n\*\*Explanation:\*\*',
        content,
        re.IGNORECASE
    )
    if hint_match:
        hint = hint_match.group(1).strip()
        # Remove bullet list marker if present
        hint = re.sub(r'^-\s+', '', hint)
        hint = re.sub(r'\n\s*', ' ', hint)
        hint = re.sub(r'\s+', ' ', hint)
        data['Hint'] = hint[:300]
    
    # ===== EXPLANATION =====
    exp_match = re.search(
        r'\*\*Explanation:\*\*\s*([\s\S]*?)\n\n\*\*Details for Each Option:\*\*',
        content,
        re.IGNORECASE
    )
    if exp_match:
        exp = exp_match.group(1).strip()
        exp = re.sub(r'\n\s*', ' ', exp)
        exp = re.sub(r'\s+', ' ', exp)
        data['Explanation'] = exp[:500]
    
    # ===== DETAILS FOR EACH OPTION =====
    details_match = re.search(
        r'\*\*Details for Each Option:\*\*\s*([\s\S]*?)(?=\n\n\*\*Reference|---)',
        content,
        re.IGNORECASE
    )
    
    if details_match:
        details_text = details_match.group(1)
        
        # Tìm toàn bộ text cho mỗi A, B, C, D
        # Pattern: từ - **A ... đến trước - **B** hoặc end
        for letter in ['A', 'B', 'C', 'D']:
            # Tìm dòng bắt đầu với - **X (X = A, B, C, or D)
            # Lấy từ đó đến trước dòng tiếp theo - **Y hoặc end
            next_letter_pattern = f"[{''.join([l for l in 'ABCD' if l > letter])}]" if letter < 'D' else ''
            if letter < 'D':
                # Có kí tự tiếp theo: A->B,C,D | B->C,D | C->D
                next_letters = ''.join([l for l in 'ABCD' if l > letter])
                pattern = rf'-\s+\*\*{letter}\s+([\s\S]+?)\n-\s+\*\*[{next_letters}]'
                detail_match = re.search(pattern, details_text)
            else:
                # D là kí tự cuối: lấy từ - **D đến end
                pattern = rf'-\s+\*\*{letter}\s+([\s\S]+?)$'
                detail_match = re.search(pattern, details_text)
            
            if detail_match:
                full_text = detail_match.group(1).strip()
                # Xóa ** thừa từ dòng - **A ...** 
                full_text = re.sub(r'^\*\*\s*', '', full_text)
                full_text = re.sub(r'\*\*\s*', '', full_text)
                # Nén whitespace
                full_text = re.sub(r'\n\s*', ' ', full_text)
                full_text = re.sub(r'\s+', ' ', full_text)
                data[f'Details for Answer {letter}'] = full_text[:400]
    
    return data


def save_to_csv(questions, csv_file):
    """Save questions to CSV"""
    
    fieldnames = [
        'No', 'Question', 'Answer A', 'Answer B', 'Answer C', 'Answer D',
        'Correct Answer', 'Hint', 'Explanation',
        'Details for Answer A', 'Details for Answer B',
        'Details for Answer C', 'Details for Answer D'
    ]
    
    with open(csv_file, 'w', newline='', encoding='utf-8-sig') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(questions)
    
    size_kb = Path(csv_file).stat().st_size / 1024
    print(f"✅ Saved {len(questions)} questions to {csv_file}")
    print(f"   Size: {size_kb:.1f} KB")


if __name__ == "__main__":
    try:
        success = main()
        if not success:
            exit(1)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)
