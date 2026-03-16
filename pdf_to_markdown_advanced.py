#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Advanced PDF to Markdown Converter
Phiên bản nâng cao với tuỳ chỉnh chi tiết cho các format PDF khác nhau
"""

import pdfplumber
import os
import re
from pathlib import Path
from typing import List, Dict, Optional


class PDFToMarkdownConverter:
    """
    Converter nâng cao cho việc extract PDF với nhiều tùy chỉnh
    """
    
    def __init__(self, 
                 preserve_layout: bool = True,
                 min_text_length: int = 1,
                 remove_page_numbers: bool = True,
                 add_page_breaks: bool = True):
        """
        Args:
            preserve_layout: Giữ nguyên layout gốc từ PDF
            min_text_length: Độ dài tối thiểu của text để giữ (loại bỏ ký tự đơn lẻ)
            remove_page_numbers: Loại bỏ số trang
            add_page_breaks: Thêm page break giữa các trang
        """
        self.preserve_layout = preserve_layout
        self.min_text_length = min_text_length
        self.remove_page_numbers = remove_page_numbers
        self.add_page_breaks = add_page_breaks
        
        # Mẫu cho các section headers trong PMP exams
        self.pmp_headers = {
            'question': re.compile(r'^question\s+\d+', re.IGNORECASE),
            'answer': re.compile(r'^answer\s*:', re.IGNORECASE),
            'hint': re.compile(r'^hint\s*:', re.IGNORECASE),
            'explanation': re.compile(r'^explanation\s*:', re.IGNORECASE),
            'reference': re.compile(r'^reference\s*:', re.IGNORECASE),
            'details': re.compile(r'^details\s+for\s+each\s+option', re.IGNORECASE),
        }
    
    def convert(self, pdf_path: str, output_path: Optional[str] = None) -> bool:
        """
        Convert PDF to Markdown
        
        Args:
            pdf_path: Đường dẫn file PDF
            output_path: Đường dẫn output (optional)
        
        Returns:
            True nếu thành công, False nếu lỗi
        """
        
        if not os.path.exists(pdf_path):
            print(f"❌ Lỗi: File '{pdf_path}' không tồn tại!")
            return False
        
        if output_path is None:
            base_name = Path(pdf_path).stem
            output_path = str(Path(pdf_path).parent / f"{base_name}_converted.md")
        
        try:
            print(f"📖 Đang xử lý: {pdf_path}")
            
            markdown_content = []
            total_chars = 0
            
            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                print(f"📊 Tổng số trang: {total_pages}\n")
                
                for page_num, page in enumerate(pdf.pages, 1):
                    text = self._extract_page_text(page)
                    
                    if text.strip():
                        if page_num > 1 and self.add_page_breaks:
                            markdown_content.append("\n---\n")
                        
                        processed = self._process_content(text)
                        markdown_content.append(processed)
                        total_chars += len(processed)
                        
                        print(f"  ✓ Page {page_num}/{total_pages} ({len(processed)} chars)")
            
            # Ghi output
            final_content = '\n'.join(markdown_content)
            
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(final_content)
            
            file_size = os.path.getsize(output_path) / 1024
            print(f"\n✅ Thành công!")
            print(f"   📝 Đã extract {total_chars:,} ký tự")
            print(f"   💾 Lưu tại: {output_path}")
            print(f"   📄 Kích thước: {file_size:.1f} KB")
            
            return True
            
        except Exception as e:
            print(f"❌ Lỗi: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def _extract_page_text(self, page) -> str:
        """
        Extract text từ một page với layout preservation
        """
        if self.preserve_layout:
            # Sử dụng extract_text_with_layout để giữ format
            text = page.extract_text(layout=True)
        else:
            text = page.extract_text()
        
        return text or ""
    
    def _process_content(self, text: str) -> str:
        """
        Xử lý content với formatting rules cho PMP exams
        """
        lines = text.split('\n')
        processed = []
        
        for line in lines:
            # Xử lý dòng trống
            if not line.strip():
                if processed and processed[-1].strip():  # Tránh multiple blank lines
                    processed.append('')
                continue
            
            # Loại bỏ số trang
            if self.remove_page_numbers:
                if re.match(r'^\s*\d+\s*$', line):
                    continue
            
            # Không xử lý dòng quá ngắn
            if len(line.strip()) < self.min_text_length:
                continue
            
            # Format PMP headers
            processed_line = self._format_pmp_header(line)
            
            # Format options
            if not processed_line.startswith('**'):
                processed_line = self._format_options(processed_line)
            
            # Thêm vào list
            processed.append(processed_line)
        
        # Xoá trailing empty lines
        while processed and not processed[-1].strip():
            processed.pop()
        
        return '\n'.join(processed)
    
    def _format_pmp_header(self, line: str) -> str:
        """
        Format các PMP exam headers thành markdown bold
        """
        for header_type, pattern in self.pmp_headers.items():
            if pattern.search(line):
                return f"\n**{line.strip()}**\n"
        
        return line
    
    def _format_options(self, line: str) -> str:
        """
        Format options (A, B, C, D) thành markdown list
        """
        pattern = re.match(r'^([A-D])\s+(.+)$', line.strip())
        if pattern:
            letter, content = pattern.groups()
            return f"- **{letter}** {content.strip()}"
        
        return line
    
    def convert_batch(self, directory: str, output_dir: Optional[str] = None) -> int:
        """
        Convert tất cả PDF files trong thư mục
        
        Returns:
            Số file được convert thành công
        """
        dir_path = Path(directory)
        
        if not dir_path.exists():
            print(f"❌ Thư mục '{directory}' không tồn tại!")
            return 0
        
        pdf_files = list(dir_path.glob('*.pdf'))
        
        if not pdf_files:
            print(f"⚠️  Không tìm thấy PDF files trong '{directory}'")
            return 0
        
        print(f"🔍 Tìm thấy {len(pdf_files)} file PDF\n")
        
        success_count = 0
        
        for pdf_file in pdf_files:
            if output_dir:
                output_file = Path(output_dir) / f"{pdf_file.stem}.md"
                output_file.parent.mkdir(parents=True, exist_ok=True)
                output_path = str(output_file)
            else:
                output_path = None
            
            if self.convert(str(pdf_file), output_path):
                success_count += 1
            
            print()  # Blank line between files
        
        print("=" * 60)
        print(f"📊 Kết quả: {success_count}/{len(pdf_files)} file được convert thành công")
        print("=" * 60)
        
        return success_count


# ============================================================================
# DEMO & EXAMPLES
# ============================================================================

def demo_basic():
    """Demo cơ bản"""
    converter = PDFToMarkdownConverter()
    converter.convert("PMP Exam Simulator 01 (1-200).pdf")


def demo_custom_settings():
    """Demo với tuỳ chỉnh settings"""
    converter = PDFToMarkdownConverter(
        preserve_layout=True,
        remove_page_numbers=True,
        add_page_breaks=True,
        min_text_length=1
    )
    converter.convert(
        "PMP Exam Simulator 01 (1-200).pdf",
        "output_custom.md"
    )


def demo_batch():
    """Demo batch convert"""
    converter = PDFToMarkdownConverter()
    converter.convert_batch(".", "markdown_output")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        converter = PDFToMarkdownConverter()
        converter.convert(pdf_file, output_file)
    else:
        # Default: demo
        print("=" * 60)
        print("🎯 Advanced PDF to Markdown Converter")
        print("=" * 60 + "\n")
        
        # Demo basic
        print("📝 Demo 1: Basic conversion\n")
        demo_basic()
