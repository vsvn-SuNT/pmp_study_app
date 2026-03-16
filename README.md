# PDF to Markdown Converter

Script Python để extract text từ file PDF và lưu vào file `.md` với việc giữ nguyên format.

## 📋 Yêu cầu

- Python 3.7+
- `pdfplumber` (tự động cài đặt)

## 🚀 Installation

```bash
pip install -r requirements.txt
```

## 💻 Cách sử dụng

### 1. **Extract một file PDF cụ thể**

```bash
# Basic usage - tạo file .md cùng thư mục với PDF
python pdf_to_markdown.py "path/to/your/file.pdf"

# Chỉ định output path
python pdf_to_markdown.py "path/to/your/file.pdf" "path/to/output.md"
```

### 2. **Extract tất cả PDF files trong thư mục hiện tại**

```bash
# Chạy từ thư mục chứa PDF files
python pdf_to_markdown.py
```

### 3. **Sử dụng trong Python code**

```python
from pdf_to_markdown import extract_pdf_to_markdown, extract_all_pdfs_in_directory

# Extract một file
extract_pdf_to_markdown("PMP Exam Simulator 01 (1-200).pdf", "output.md")

# Extract tất cả PDF trong thư mục
extract_all_pdfs_in_directory("./path/to/folder")
```

## 🎯 Ví dụ

```bash
# Extract file PMP Exam Simulator
python pdf_to_markdown.py "PMP Exam Simulator 01 (1-200).pdf"

# Output sẽ tạo ra: PMP Exam Simulator 01 (1-200).md
```

## ✨ Tính năng

✅ **Giữ nguyên format gốc**: Bảo toàn cấu trúc, khoảng trắng, xuống dòng từ PDF
✅ **Markdown formatting**: Tự động định dạng heading, options, và key sections
✅ **Page breaks**: Thêm page separator (`---`) giữa các trang
✅ **UTF-8 encoding**: Hỗ trợ đầy đủ tiếng Việt và các ký tự đặc biệt
✅ **Batch processing**: Có thể xử lý nhiều file PDF cùng lúc
✅ **Error handling**: Kiểm tra lỗi chi tiết và báo cáo rõ ràng

## 📝 Format Markdown Output

Script tự động định dạng:

```markdown
**Question**
[Nội dung câu hỏi...]

- **A [Option A content]**
- **B [Option B content]**
- **C [Option C content]**
- **D [Option D content]**

**Answer:**
[Đáp án...]

**Hint:**
[Gợi ý...]

**Explanation:**
[Giải thích chi tiết...]

**Details for Each Option**
[Chi tiết từng option...]

**Reference:**
[Nguồn tài liệu...]

---
[Page tiếp theo...]
```

## 🔧 Tuỳ chỉnh

Để tuỳ chỉnh format, chỉnh sửa hàm `_process_text()` trong file `pdf_to_markdown.py`:

```python
def _process_text(text):
    # Thêm logic tuỳ chỉnh của bạn ở đây
    ...
```

## 🐛 Troubleshooting

**Vấn đề**: "ModuleNotFoundError: No module named 'pdfplumber'"
```bash
# Giải pháp:
pip install pdfplumber
```

**Vấn đề**: Encoding lỗi với tiếng Việt
```bash
# Đã fix sẵn với UTF-8 encoding, không cần lo
```

**Vấn đề**: Format không như mong muốn
- Mở file `pdf_to_markdown.py`
- Tuỳ chỉnh hàm `_process_text()` theo nhu cầu
- Chạy lại script

## 📚 Thư viện sử dụng

- **pdfplumber**: Thư viện extract text từ PDF với layout preservation
  - 📖 Doc: https://github.com/jsvine/pdfplumber

## 📄 License

Miễn phí sử dụng
