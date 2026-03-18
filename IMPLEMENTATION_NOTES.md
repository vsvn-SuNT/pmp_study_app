# Import/Clear Exams Feature - Implementation Summary

Tôi đã thêm chức năng xóa và import exam từ file CSV trên UI. Dưới đây là chi tiết các thay đổi:

## Backend Changes

### 1. Models - Thêm deleteAll() Methods
- **exam-set-repository.js**: Thêm `deleteAll()` để xóa tất cả exam sets
- **question-repository.js**: Thêm `deleteAll()` để xóa tất cả questions
- **session-repository.js**: Thêm `deleteAll()` để xóa tất cả sessions

### 2. Routes - Thêm API Endpoints
- **exams-routes.js**: 
  - `DELETE /api/exams` - Xóa tất cả exams, questions, và sessions
  - `POST /api/exams/import` - Import exam từ CSV content (JSON body với csvContent + filename)

### 3. Database
- **src/db/clear.js** - Utility script để clear database (dùng bởi import-data.ps1)

### 4. Server Configuration
- **server.js**: Pass repositories vào createExamsRoutes để support clear/import

## Frontend Changes

### 1. UI Components
- **app.js - renderExamSelection()**:
  - Thêm "Manage Exams" section
  - File input để chọn CSV file
  - "Import Exam" button - gọi `importExam()`
  - "Clear All" button - gọi `clearAllExams()`

### 2. Import/Clear Functions
- `importExam()` - Đọc file CSV, gửi lên API, reload exam list
- `clearAllExams()` - Xóa tất cả dữ liệu sau khi confirm

### 3. Styling
- **app.css**: Thêm `.import-controls` styles cho import section

## PowerShell Scripts

### import-data.ps1
Cập nhật để:
1. Clear database trước (dùng `src/db/clear.js`)
2. Run migration
3. Import CSV từ thư mục

## Cách Sử Dụng

### Trên UI:
1. Chọn file CSV từ máy
2. Click "Import Exam" để import
3. Click "Clear All" để xóa tất cả exams (có confirmation)

### Từ Command Line:
```powershell
./scripts/import-data.ps1
```
Script sẽ:
1. Clear tất cả dữ liệu cũ
2. Run migration
3. Import tất cả CSV từ `/pdf_to_csv/csv`

## API Endpoints

### Clear Database
```
DELETE /api/exams
Response: { message: 'All exams and sessions cleared' }
```

### Import Exam
```
POST /api/exams/import
Body: {
  csvContent: "No,Question,Answer A,...",  // CSV file content as string
  filename: "PMP_Questions.csv"
}
Response: {
  success: true,
  message: "Imported 200 questions from PMP_Questions.csv",
  examSet: { id, title, questionCount, ... }
}
```

## Architecture Notes

- Import qua UI gửi CSV content dạng JSON (không multipart) để đơn giản
- Temp file được tạo trong /tmp (hoặc Windows temp) rồi xóa sau import
- Clear database xóa từng table theo thứ tự: sessions → questions → exam_sets
- UI cập nhật tự động sau import/clear

## Testing

Cần test:
1. Import từ UI:
   - ✓ Chọn file CSV valid
   - Test chọn file invalid
   - Test upload kích thước lớn
2. Clear từ UI:
   - Test confirm dialog
   - Check database cleared
3. Command line script:
   - Test ./scripts/import-data.ps1
   - Check tất cả CSV được import
