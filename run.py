#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Quick Run Script - Extract PDF hiện tại
Chạy script này để extract tất cả PDF files trong thư mục
"""

import os
from pathlib import Path
from pdf_to_markdown import extract_pdf_to_markdown, extract_all_pdfs_in_directory

if __name__ == "__main__":
    # Lấy thư mục hiện tại
    current_dir = Path(__file__).parent
    
    print("=" * 60)
    print("🚀 PDF to Markdown Converter - Quick Run")
    print("=" * 60)
    
    # Tìm tất cả PDF files
    pdf_files = list(current_dir.glob('*.pdf'))
    
    if not pdf_files:
        print("⚠️  Không tìm thấy file PDF nào trong thư mục hiện tại")
        print(f"📁 Thư mục: {current_dir}")
    else:
        print(f"\n📁 Thư mục: {current_dir}")
        print(f"📊 Tìm thấy {len(pdf_files)} file PDF:\n")
        
        for i, pdf_file in enumerate(pdf_files, 1):
            print(f"  {i}. {pdf_file.name}")
        
        print("\n" + "=" * 60)
        print("⏳ Đang xử lý...\n")
        
        # Extract tất cả files
        extract_all_pdfs_in_directory(str(current_dir))
        
        print("\n" + "=" * 60)
        print("✅ Hoàn tất!")
        print("=" * 60)
        
        # Hiển thị file được tạo
        md_files = list(current_dir.glob('*.md'))
        md_files = [f for f in md_files if f.name != 'README.md']
        
        if md_files:
            print("\n📄 File Markdown được tạo:")
            for md_file in md_files:
                size = md_file.stat().st_size / 1024  # KB
                print(f"  • {md_file.name} ({size:.1f} KB)")
