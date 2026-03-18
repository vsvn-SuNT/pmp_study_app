#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PDF to Markdown Converter
Extracts text từ file PDF và lưu vào file .md với format được bảo toàn
"""

import pdfplumber
import os
from pathlib import Path


def extract_pdf_to_markdown(pdf_directory, output_directory=None):
    """
    Extract text từ tất cả file PDF trong một thư mục và lưu vào markdown files
    
    Args:
        pdf_directory (str): Đường dẫn tới thư mục chứa file PDF
        output_directory (str, optional): Đường dẫn tới thư mục lưu markdown output.
                                        Nếu None, sẽ tạo file .md cùng thư mục với PDF
    
    Returns:
        int: Số file PDF được xử lý thành công
    """
    
    pdf_dir = Path(pdf_directory)
    
    # Kiểm tra thư mục có tồn tại không
    if not pdf_dir.exists():
        print(f"❌ Lỗi: Thư mục '{pdf_directory}' không tồn tại!")
        return 0
    
    # Tìm tất cả file PDF
    pdf_files = list(pdf_dir.glob('*.pdf'))
    
    if not pdf_files:
        print(f"⚠️  Không tìm thấy file PDF nào trong thư mục '{pdf_directory}'")
        return 0
    
    print(f"🔍 Tìm thấy {len(pdf_files)} file PDF\n")
    
    success_count = 0
    
    for pdf_file in pdf_files:
        try:
            # Xác định đường dẫn output
            if output_directory:
                output_dir = Path(output_directory)
                output_dir.mkdir(parents=True, exist_ok=True)
                output_path = output_dir / f"{pdf_file.stem}.md"
            else:
                output_path = pdf_file.with_suffix('.md')
            
            print(f"📖 Đang xử lý: {pdf_file.name}")
            print(f"💾 Output: {output_path}")
            
            markdown_content = []
            page_count = 0
            
            # Mở và đọc PDF file
            with pdfplumber.open(str(pdf_file)) as pdf:
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
            with open(str(output_path), 'w', encoding='utf-8') as f:
                f.write('\n'.join(markdown_content))
            
            print(f"✅ Thành công! Đã extract {page_count} trang từ PDF")
            print(f"📄 File markdown được lưu tại: {output_path}\n")
            success_count += 1
            
        except Exception as e:
            print(f"❌ Lỗi khi xử lý {pdf_file.name}: {str(e)}\n")
    
    return success_count


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
    (Deprecated) Sử dụng extract_pdf_to_markdown thay vì hàm này
    
    Extract tất cả PDF files trong một thư mục
    
    Args:
        directory (str): Đường dẫn thư mục chứa PDF files
        output_directory (str, optional): Thư mục lưu file markdown
    """
    return extract_pdf_to_markdown(directory, output_directory)


# Main script
if __name__ == "__main__":
    import sys
    
    # Lấy đường dẫn từ arguments hoặc sử dụng default
    if len(sys.argv) > 1:
        pdf_directory = sys.argv[1]
        output_directory = sys.argv[2] if len(sys.argv) > 2 else None
        extract_pdf_to_markdown(pdf_directory, output_directory)
    else:
        # Default: Extract từ tất cả PDF files trong thư mục hiện tại
        current_dir = Path(__file__).parent
        extract_pdf_to_markdown(str(current_dir))
