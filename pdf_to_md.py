#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF to Markdown Converter
Extracts text từ file PDF và lưu vào file .md với format được bảo toàn
"""

import pdfplumber
import os
from pathlib import Path


def extract_pdf_to_markdown(pdf_path, output_path=None):
    """
    Extract text từ PDF file và lưu vào markdown file
    
    Args:
        pdf_path (str): Đường dẫn tới file PDF
        output_path (str, optional): Đường dẫn tới file markdown output.
                                   Nếu None, sẽ tạo file .md cùng thư mục với PDF
    
    Returns:
        bool: True nếu thành công, False nếu có lỗi
    """
    
    # Kiểm tra file PDF có tồn tại không
    if not os.path.exists(pdf_path):
        print(f"❌ Lỗi: File PDF '{pdf_path}' không tồn tại!")
        return False
    
    # Xác định đường dẫn output
    if output_path is None:
        base_path = Path(pdf_path).stem
        output_path = Path(pdf_path).parent / f"{base_path}.md"
    
    try:
        print(f"📖 Đang xử lý: {pdf_path}")
        print(f"💾 Output: {output_path}")
        
        markdown_content = []
        page_count = 0
        
        # Mở và đọc PDF file
        with pdfplumber.open(pdf_path) as pdf:
            total_pages = len(pdf.pages)
            
            for page_num, page in enumerate(pdf.pages, 1):
                # Extract text với layout information
                text = page.extract_text()
                
                if text:
                    page_count += 1
                    # Thêm page break khi có nhiều trang
                    if page_num > 1:
                        markdown_content.append("\n---\n")
                    
                    # Xử lý text để giữ format
                    markdown_content.append(_process_text(text))
                    print(f"  ✓ Trang {page_num}/{total_pages}")
        
        # Ghi vào file markdown
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(markdown_content))
        
        print(f"\n✅ Thành công! Đã extract {page_count} trang từ PDF")
        print(f"📄 File markdown được lưu tại: {output_path}")
        return True
        
    except Exception as e:
        print(f"❌ Lỗi khi xử lý PDF: {str(e)}")
        return False


def _process_text(text):
    """
    Xử lý text để cải thiện format markdown
    Giữ lại cấu trúc gốc nhưng thêm markdown formatting
    
    Args:
        text (str): Text được extract từ PDF
    
    Returns:
        str: Text đã được format cho markdown
    """
    
    lines = text.split('\n')
    processed_lines = []
    
    for line in lines:
        stripped = line.strip()
        
        # Bỏ qua dòng trống
        if not stripped:
            processed_lines.append('')
        
        # Định dạng các heading chính (Question, Answer, Hint, Explanation, Details, Reference)
        elif stripped.upper() in ['QUESTION', 'ANSWER:', 'HINT:', 'EXPLANATION:', 'REFERENCE:']:
            processed_lines.append(f"\n**{stripped}**\n")
        elif stripped.lower().startswith('details for each option'):
            processed_lines.append(f"\n**{stripped}**\n")
        
        # Định dạng các option (A, B, C, D)
        elif len(stripped) > 1 and stripped[0] in ['A', 'B', 'C', 'D'] and stripped[1] in [' ', '\t']:
            processed_lines.append(f"- **{stripped}**")
        
        # Giữ nguyên các dòng khác
        else:
            processed_lines.append(line.rstrip())
    
    return '\n'.join(processed_lines)


def extract_all_pdfs_in_directory(directory, output_directory=None):
    """
    Extract tất cả PDF files trong một thư mục
    
    Args:
        directory (str): Đường dẫn thư mục chứa PDF files
        output_directory (str, optional): Thư mục lưu file markdown
    """
    
    directory = Path(directory)
    
    if not directory.exists():
        print(f"❌ Thư mục '{directory}' không tồn tại!")
        return
    
    pdf_files = list(directory.glob('*.pdf'))
    
    if not pdf_files:
        print(f"⚠️  Không tìm thấy file PDF nào trong thư mục '{directory}'")
        return
    
    print(f"🔍 Tìm thấy {len(pdf_files)} file PDF\n")
    
    for pdf_file in pdf_files:
        if output_directory:
            output_path = Path(output_directory) / f"{pdf_file.stem}.md"
        else:
            output_path = pdf_file.with_suffix('.md')
        
        extract_pdf_to_markdown(str(pdf_file), str(output_path))
        print()


# Main script
if __name__ == "__main__":
    import sys
    
    # Lấy đường dẫn từ arguments hoặc sử dụng default
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        extract_pdf_to_markdown(pdf_file, output_file)
    else:
        # Default: Extract từ tất cả PDF files trong thư mục hiện tại
        current_dir = Path(__file__).parent
        extract_all_pdfs_in_directory(str(current_dir))
