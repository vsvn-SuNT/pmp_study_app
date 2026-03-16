#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup Script - Cài đặt dependencies tự động
Chạy script này lần đầu tiên để cài đặt tất cả packages cần thiết
"""

import subprocess
import sys
from pathlib import Path

def install_requirements():
    """Cài đặt tất cả requirements từ requirements.txt"""
    
    print("=" * 70)
    print("🚀 PDF to Markdown - Setup & Installation")
    print("=" * 70)
    
    # Kiểm tra Python version
    print(f"\n📊 Python Version: {sys.version}")
    
    if sys.version_info < (3, 7):
        print("❌ Lỗi: Python 3.7+ được yêu cầu!")
        return False
    
    print("✅ Python version OK\n")
    
    # Kiểm tra requirements.txt
    requirements_file = Path(__file__).parent / "requirements.txt"
    
    if not requirements_file.exists():
        print(f"❌ Không tìm thấy {requirements_file}")
        return False
    
    print(f"📋 Requirements file: {requirements_file}")
    
    # Hiển thị packages sẽ cài đặt
    print("\n📦 Packages sẽ cài đặt:")
    with open(requirements_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#'):
                print(f"   • {line}")
    
    # Xác nhận
    print("\n" + "=" * 70)
    response = input("Bạn có muốn tiếp tục cài đặt? (y/n): ").strip().lower()
    
    if response not in ['y', 'yes']:
        print("❌ Đã hủy installation")
        return False
    
    # Cài đặt
    print("\n⏳ Đang cài đặt packages...\n")
    
    try:
        # Upgrade pip trước
        print("🔧 Upgrading pip...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "--upgrade", "pip"
        ])
        
        # Cài đặt requirements
        print("\n📦 Cài đặt requirements...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", str(requirements_file)
        ])
        
        print("\n" + "=" * 70)
        print("✅ Cài đặt thành công!")
        print("=" * 70)
        
        # Hướng dẫn tiếp theo
        print("\n📝 Tiếp theo, bạn có thể:")
        print("\n  1️⃣  Chạy script nhanh:")
        print("     python run.py\n")
        print("  2️⃣  Extract file cụ thể:")
        print("     python pdf_to_markdown.py 'your-file.pdf'\n")
        print("  3️⃣  Xem hướng dẫn chi tiết:")
        print("     - Mở file USAGE_GUIDE.md")
        print("     - Xem file README.md\n")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Lỗi khi cài đặt: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Lỗi không mong muốn: {e}")
        return False

def verify_installation():
    """Kiểm tra các packages đã cài đặt"""
    
    print("\n" + "=" * 70)
    print("🔍 Verify Installation")
    print("=" * 70 + "\n")
    
    packages = ['pdfplumber']
    all_ok = True
    
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package}: Installed")
        except ImportError:
            print(f"❌ {package}: Not installed")
            all_ok = False
    
    if all_ok:
        print("\n✅ Tất cả packages đã cài đặt thành công!")
        return True
    else:
        print("\n❌ Một số packages chưa được cài đặt")
        print("   Hãy chạy lại script này để cài đặt")
        return False

def main():
    """Main function"""
    
    if not install_requirements():
        return False
    
    if not verify_installation():
        return False
    
    print("\n🎉 Setup hoàn tất! Bạn đã sẵn sàng sử dụng PDF to Markdown Converter")
    return True

if __name__ == "__main__":
    import os
    
    # Clear screen
    os.system('cls' if os.name == 'nt' else 'clear')
    
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n❌ Setup bị hủy bởi người dùng")
        sys.exit(1)
