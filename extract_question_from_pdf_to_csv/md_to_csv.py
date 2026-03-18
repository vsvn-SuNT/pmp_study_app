#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PMP Markdown to CSV - Complete Rewrite
Simple, robust, tested version
"""

import re
import csv
from pathlib import Path


def main(md_file, output_dir="csv"):
    """Main conversion
    
    Args:
        md_file (str): Đường dẫn file markdown
        output_dir (str): Thư mục output (mặc định: csv)
    """
    
    print("\n" + "=" * 70)
    print("🎯 PMP MD → CSV Converter")
    print("=" * 70 + "\n")
    
    md_path = Path(md_file)
    
    # Check file exists
    if not md_path.exists():
        print(f"❌ File not found: {md_file}")
        return False
    
    # Tạo thư mục output nếu chưa tồn tại
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Tên file CSV output
    csv_file = str(output_path / f"{md_path.stem}.csv")
    
    print(f"📖 Reading: {md_file}")
    
    with open(str(md_path), 'r', encoding='utf-8') as f:
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
    # Find "Correct Answer:" line first
    correct_answer_idx = -1
    for idx, line in enumerate(lines):
        if re.match(r'^\s*(?:Correct\s+)?Answer\s*:\s*[A-D]', line, re.IGNORECASE):
            correct_answer_idx = idx
            break
    
    # If found "Correct Answer:", backward search to find the 4 answer choices (A, B, C, D)
    # They should be immediately before "Correct Answer:" line
    answer_start = 999
    answer_end = len(lines)
    
    if correct_answer_idx >= 0:
        answer_end = correct_answer_idx
        # Backward search from correct_answer to find where answers start
        # Look for the pattern: 4 consecutive lines with - **A, - **B, - **C, - **D
        for idx in range(correct_answer_idx - 1, -1, -1):
            line = lines[idx].strip()
            if re.match(r'^\s*-\s+\*\*D\s+', line):
                # Found D, so answers should be somewhere before this
                # Now search backwards from here to find A, B, C, D group
                d_idx = idx
                # Go back to find C, B, A
                if d_idx > 2:
                    c_match = re.match(r'^\s*-\s+\*\*C\s+', lines[d_idx - 1].strip())
                    b_match = re.match(r'^\s*-\s+\*\*B\s+', lines[d_idx - 2].strip())
                    a_match = re.match(r'^\s*-\s+\*\*A\s+', lines[d_idx - 3].strip())
                    
                    if c_match and b_match and a_match:
                        # Found the correct sequence: A, B, C, D
                        answer_start = d_idx - 3
                        break
    
    # Fallback: if not found with above method, use old method but skip lines before question content
    if answer_start == 999:
        for idx, line in enumerate(lines):
            if re.match(r'^\s*-\s+\*\*[A-D]\s+', line):
                answer_start = idx
                break
    
    # ===== QUESTION TEXT =====
    # Find where actual question ends (line ending with ?)
    question_end_idx = 0
    for idx in range(min(answer_start, len(lines))):
        if lines[idx].rstrip().endswith('?'):
            question_end_idx = idx + 1
    
    # If no ? found, use answer_start
    if question_end_idx == 0:
        question_end_idx = min(answer_start, len(lines))
    
    # Collect question lines (everything before the actual question ends with ?)
    q_text = []
    for line in lines[:question_end_idx]:
        s = line.strip()
        # Skip empty, skip markdown headers, skip separators, skip metadata lines
        # Skip: "Question X of Y", "Question ID: ...", "of 200 Question ID: ..."
        # But DON'T skip "- **A ..." if it's part of the scenario (before the ?)
        if (s and not s.startswith('**') and not s.startswith('---') and 
            not s.startswith('of ') and not s.startswith('Question ') and 
            not s.startswith('Question ID') and not s.startswith('Top of Form')):
            # Strip the "- **A " prefix if this is scenario description
            if re.match(r'^\s*-\s+\*\*[A-D]\s+', s):
                # Remove the "- **X " prefix
                s = re.sub(r'^\s*-\s+\*\*[A-D]\s+', '', s)
            # Remove trailing ** if present
            s = re.sub(r'\*\*\s*$', '', s)
            if s:
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
        # Match both "Answer: X" and "Correct Answer: X" formats
        match = re.match(r'^\s*(?:Correct\s+)?Answer\s*:\s*([A-D])', line, re.IGNORECASE)
        if match:
            data['Correct Answer'] = match.group(1)
            break
    
    # ===== HINT =====
    # Try pattern 1: **Hint:** label + text
    hint_match = re.search(
        r'\*\*Hint:\*\*\s*([\s\S]*?)(?=\n\n\*\*(?:Explanation|Details):\*\*)',
        content,
        re.IGNORECASE
    )
    
    if hint_match:
        hint = hint_match.group(1).strip()
    else:
        # Try pattern 2: Text between "Answer: X" and "**Explanation:**" (without Hint label)
        # This handles cases where hint text is directly after "Answer: X" line
        hint_match = re.search(
            r'(?:Correct\s+)?Answer\s*:\s*[A-D]\n([\s\S]+?)\n\n\*\*Explanation:\*\*',
            content,
            re.IGNORECASE
        )
        if hint_match:
            hint = hint_match.group(1).strip()
        else:
            hint = ""
    
    if hint:
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
        r'\*\*Details for Each Option:\*\*\s*([\s\S]*?)(?=\*\*Reference|\Z)',
        content,
        re.IGNORECASE
    )
    
    if details_match:
        details_text = details_match.group(1)
        
        # Extract text for each A, B, C, D
        for letter in ['A', 'B', 'C', 'D']:
            if letter < 'D':
                # For A, B, C: find from - **A to before next option - **B, - **C, etc.
                next_letters = ''.join([l for l in 'ABCD' if l > letter])
                # Pattern: - **A text until \n- **[B,C,D] or end
                pattern = rf'-\s+\*\*{letter}\s+([\s\S]+?)(?=\n-\s+\*\*[{next_letters}]|$)'
                detail_match = re.search(pattern, details_text)
            else:
                # D is last: from - **D to end
                pattern = rf'-\s+\*\*{letter}\s+([\s\S]+?)$'
                detail_match = re.search(pattern, details_text)
            
            if detail_match:
                full_text = detail_match.group(1).strip()
                # Remove ** artifacts
                full_text = re.sub(r'^\*\*\s*', '', full_text)
                full_text = re.sub(r'\*\*\s*', '', full_text)
                # Compress whitespace
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
    import sys
    
    # Mặc định: sử dụng tất cả file .md trong thư mục hiện tại
    if len(sys.argv) > 1:
        md_file = sys.argv[1]
        output_dir = sys.argv[2] if len(sys.argv) > 2 else "csv"
        try:
            success = main(md_file, output_dir)
            if not success:
                exit(1)
        except Exception as e:
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            exit(1)
    else:
        # Xử lý tất cả file .md trong thư mục hiện tại
        md_dir = Path(__file__).parent
        md_files = list(md_dir.glob("*.md"))
        
        if not md_files:
            print("❌ No markdown files found in current directory")
            exit(1)
        
        for md_file in md_files:
            print(f"\n{'=' * 70}")
            try:
                success = main(str(md_file), "csv")
                if not success:
                    print(f"⚠️  Failed to process {md_file.name}")
            except Exception as e:
                print(f"\n❌ Error processing {md_file.name}: {e}")
                import traceback
                traceback.print_exc()
