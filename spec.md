# Product Spec - MVP cho công cụ AI Test Automation kiểu testRigor

## 1. Mục tiêu tài liệu
Tài liệu này mô tả đặc tả sản phẩm cho phiên bản **MVP** của một công cụ kiểm thử tự động bằng AI, cho phép người dùng mô tả test bằng ngôn ngữ tự nhiên và hệ thống sẽ chuyển đổi thành các bước thực thi tự động trên web application.

Mục tiêu của MVP là:
- Chứng minh được tính khả thi của mô hình **natural language -> executable UI test**.
- Hỗ trợ được một tập use case hẹp nhưng có giá trị cao.
- Tạo nền tảng để phát triển tiếp sang self-healing, test generation, multi-platform, và quản trị test suite.

---

## 2. Bối cảnh và bài toán
Các framework test automation hiện tại như Selenium, Playwright, Cypress yêu cầu người dùng:
- biết code;
- hiểu selector và DOM;
- duy trì test thường xuyên khi UI thay đổi.

Một công cụ tương tự testRigor cần giải quyết các vấn đề sau:
- giảm phụ thuộc vào kỹ năng lập trình;
- cho phép viết test bằng tiếng Anh hoặc ngôn ngữ tự nhiên có cấu trúc đơn giản;
- giảm chi phí bảo trì test khi giao diện thay đổi nhẹ;
- rút ngắn thời gian từ test idea đến test execution.

---

## 3. Mục tiêu sản phẩm MVP

### 3.1 Mục tiêu chính
MVP phải cho phép người dùng:
1. nhập một test case bằng ngôn ngữ tự nhiên;
2. hệ thống phân tích thành danh sách step có cấu trúc;
3. thực thi các step đó trên trình duyệt;
4. trả về kết quả pass/fail cùng log và screenshot khi lỗi.

### 3.2 Không nằm trong phạm vi MVP
Các tính năng sau **không bắt buộc** trong MVP:
- mobile automation;
- desktop automation;
- API testing độc lập;
- full self-healing bằng AI vision;
- autonomous test generation từ requirement hoặc analytics;
- test suite scheduling;
- RBAC, billing, multi-tenant production hardening;
- recorder chrome extension;
- parallel execution quy mô lớn.

---

## 4. Định nghĩa MVP
MVP chỉ tập trung vào **web UI testing** với input là ngôn ngữ tự nhiên theo cú pháp đơn giản.

Ví dụ input:

```text
Open https://example.com/login
Type "user@example.com" into email field
Type "123456" into password field
Click "Sign in"
Verify text "Dashboard" is visible
```

Hệ thống sẽ:
- parse input thành DSL nội bộ;
- ánh xạ mỗi step sang hành động Playwright;
- cố gắng tìm element theo text, role, label, placeholder hoặc semantic alias;
- thực thi tuần tự;
- xuất report cơ bản.

---

## 5. Người dùng mục tiêu

### 5.1 Persona chính
**QA Engineer / SDET / Product QA**
- có hiểu biết kiểm thử;
- muốn giảm thời gian viết script;
- có thể chấp nhận format natural language có quy ước.

### 5.2 Persona phụ
**Business Analyst / PM kỹ thuật**
- muốn mô tả acceptance test mà không viết code;
- chủ yếu dùng để demo, review flow, hoặc tạo test nháp.

### 5.3 Không ưu tiên ở MVP
- người dùng non-technical hoàn toàn;
- enterprise admin cần governance sâu;
- team có nhu cầu mobile và desktop ngay từ đầu.

---

## 6. Giá trị cốt lõi của MVP
MVP phải tạo ra 3 giá trị rõ ràng:

1. **Viết test nhanh hơn**
   - người dùng không phải viết Playwright code thủ công cho các flow phổ biến.

2. **Dễ đọc và dễ review**
   - test được biểu diễn bằng câu lệnh gần với hành vi người dùng.

3. **Ít phụ thuộc selector hơn cách truyền thống**
   - hệ thống ưu tiên locator theo role, label, text, placeholder trước khi dùng CSS/XPath.

---

## 7. Phạm vi chức năng MVP

### 7.1 Input test bằng natural language
Người dùng có thể nhập test dưới dạng nhiều dòng, mỗi dòng là một hành động.

Ví dụ:
- Open URL
- Click element
- Type text
- Press key
- Wait for text
- Verify text visible
- Verify URL contains

### 7.2 Parse natural language sang DSL
Hệ thống cần chuyển input thành DSL nội bộ chuẩn hóa.

Ví dụ:

```json
[
  {"action": "open", "url": "https://example.com/login"},
  {"action": "type", "target": "email field", "value": "user@example.com"},
  {"action": "type", "target": "password field", "value": "123456"},
  {"action": "click", "target": "Sign in"},
  {"action": "assert_text_visible", "text": "Dashboard"}
]
```

### 7.3 Execute trên browser
Execution engine sử dụng Playwright để:
- mở browser;
- thực hiện action;
- chờ UI ổn định;
- ghi log cho từng step;
- capture screenshot khi fail.

### 7.4 Kết quả chạy test
Mỗi lần chạy cần trả về:
- status tổng thể: pass / fail;
- status từng step;
- thông điệp lỗi;
- screenshot khi step fail;
- optional video hoặc trace nếu khả thi.

### 7.5 Quản lý test case tối thiểu
MVP cần hỗ trợ tối thiểu:
- tạo test case;
- sửa test case;
- chạy test case;
- xem lịch sử một số lần chạy gần nhất.

Có thể chấp nhận lưu local hoặc database đơn giản.

---

## 8. User stories

### 8.1 Tạo test case
Là một QA engineer,
Tôi muốn nhập test bằng ngôn ngữ tự nhiên,
Để tôi không phải viết Playwright script từ đầu.

### 8.2 Chạy test case
Là một QA engineer,
Tôi muốn nhấn Run để thực thi test trên browser,
Để tôi biết flow đang pass hay fail.

### 8.3 Xem lỗi
Là một QA engineer,
Tôi muốn xem step nào fail và screenshot tương ứng,
Để tôi debug nhanh hơn.

### 8.4 Chỉnh test dễ dàng
Là một QA engineer,
Tôi muốn sửa câu lệnh natural language rồi chạy lại ngay,
Để tôi iterate nhanh trong quá trình xây test.

---

## 9. Danh sách hành động hỗ trợ trong MVP

### 9.1 Action bắt buộc
1. `open`
2. `click`
3. `type`
4. `press`
5. `wait_for_text`
6. `assert_text_visible`
7. `assert_url_contains`
8. `select_option`
9. `check`
10. `uncheck`

### 9.2 Ví dụ cú pháp người dùng
- `Open https://app.example.com`
- `Click "Login"`
- `Type "alice@example.com" into email field`
- `Type "secret" into password field`
- `Press Enter`
- `Wait for text "Welcome"`
- `Verify text "Dashboard" is visible`
- `Verify URL contains "/dashboard"`
- `Select "Vietnam" in country dropdown`
- `Check "Remember me"`

### 9.3 Chưa hỗ trợ ở MVP
- drag and drop;
- upload file phức tạp;
- iframe handling phức tạp;
- tab/window switching nâng cao;
- captcha;
- OTP qua email/SMS;
- visual regression.

---

## 10. Quy ước ngôn ngữ đầu vào
Để MVP ổn định, input natural language cần theo **semi-structured English** thay vì free-form hoàn toàn.

Nguyên tắc:
- mỗi dòng một action;
- action bắt đầu bằng động từ chuẩn hóa;
- text cần quote khi có khoảng trắng hoặc ký tự đặc biệt;
- target nên ngắn gọn và bám theo text/label người dùng nhìn thấy trên UI.

Ví dụ hợp lệ:
- `Click "Add to cart"`
- `Type "abc@gmail.com" into email field`

Ví dụ chưa nên hỗ trợ ở MVP:
- `Log me in with my usual account and go to the dashboard`

Lý do: quá mơ hồ cho phiên bản đầu.

---

## 11. Kiến trúc giải pháp đề xuất

### 11.1 Thành phần chính
1. **Frontend UI**
   - form nhập test;
   - danh sách test case;
   - màn hình run result.

2. **API Backend**
   - nhận test input;
   - gọi parser;
   - lưu test case;
   - khởi chạy execution.

3. **NL Parser / LLM Adapter**
   - parse natural language sang DSL;
   - validate step;
   - normalize target/action.

4. **Execution Engine**
   - nhận DSL;
   - dùng Playwright để chạy;
   - log kết quả từng step.

5. **Locator Resolver**
   - ánh xạ target sang selector/locator;
   - ưu tiên semantic locator.

6. **Storage**
   - lưu test case, run result, artifact paths.

### 11.2 Kiến trúc logic

```text
User -> Frontend -> Backend API -> Parser -> DSL
                               -> Execution Engine -> Browser
                               -> Storage
                               -> Report / Screenshot
```

---

## 12. Chi tiết kỹ thuật theo module

### 12.1 Frontend
MVP UI có thể rất đơn giản, gồm 3 màn hình:

#### A. Test list
- danh sách test case;
- nút tạo mới;
- nút run.

#### B. Test editor
- textarea nhập natural language;
- nút parse preview;
- nút save;
- nút run.

#### C. Run result
- trạng thái pass/fail;
- danh sách step;
- lỗi chi tiết;
- screenshot fail.

### 12.2 Backend API
Đề xuất REST API:
- `POST /tests`
- `GET /tests`
- `GET /tests/:id`
- `PUT /tests/:id`
- `POST /tests/:id/run`
- `GET /runs/:id`

### 12.3 Parser
Có 2 hướng triển khai:

#### Hướng A - Rule-based trước
- regex + grammar đơn giản;
- dễ kiểm soát;
- ổn định cho MVP.

#### Hướng B - LLM-assisted parser
- dùng LLM để map câu lệnh sang JSON DSL;
- thêm validator phía sau để tránh output sai schema.

**Khuyến nghị:**
- bắt đầu bằng **rule-based + schema validator**;
- chỉ dùng LLM cho câu lệnh chưa parse được hoặc cho chế độ nâng cao.

### 12.4 DSL schema
Mỗi step cần có schema chuẩn:

```json
{
  "action": "click | type | open | assert_text_visible | ...",
  "target": "string",
  "value": "string",
  "url": "string",
  "timeoutMs": 10000,
  "optional": false
}
```

### 12.5 Locator Resolver
Chiến lược resolve target theo thứ tự ưu tiên:
1. `getByRole`
2. `getByLabel`
3. `getByPlaceholder`
4. `getByText`
5. `getByTestId` nếu có config
6. CSS fallback hạn chế

Ví dụ:
- `Click "Login"` -> tìm button/link/text có label `Login`
- `Type "abc@gmail.com" into email field` -> tìm input có label/placeholder liên quan đến `email`

### 12.6 Execution Engine
Engine cần:
- launch browser context;
- set timeout mặc định;
- chạy step tuần tự;
- before each step: ghi log;
- on failure: screenshot + stop execution;
- on finish: trả summary.

### 12.7 Storage
Đề xuất cho MVP:
- PostgreSQL hoặc SQLite cho metadata;
- local filesystem hoặc object storage cho screenshot/artifact.

Bảng tối thiểu:
- `test_cases`
- `test_runs`
- `test_run_steps`

---

## 13. Luồng xử lý chính

### 13.1 Tạo test
1. User nhập test bằng text.
2. Backend parse thành DSL.
3. Nếu parse fail, trả lỗi có gợi ý sửa.
4. Nếu parse thành công, lưu test case.

### 13.2 Run test
1. User bấm Run.
2. Backend lấy DSL.
3. Execution engine chạy trên Playwright.
4. Mỗi step cập nhật trạng thái.
5. Nếu fail, capture screenshot.
6. Trả report.

---

## 14. Xử lý lỗi và trải nghiệm người dùng

### 14.1 Lỗi parse
Ví dụ:
- input không đúng pattern;
- action không được hỗ trợ;
- câu lệnh thiếu target hoặc value.

Phản hồi cần rõ:
- dòng nào lỗi;
- lỗi gì;
- ví dụ câu đúng.

### 14.2 Lỗi execution
Ví dụ:
- không tìm thấy element;
- text không xuất hiện trong timeout;
- URL không đúng;
- browser crash.

Phản hồi cần có:
- step fail;
- exception message;
- screenshot;
- optional DOM snapshot.

---

## 15. Phi chức năng (non-functional requirements)

### 15.1 Hiệu năng
- parse một test dưới 2 giây trong trường hợp rule-based;
- thời gian phản hồi khi bắt đầu run dưới 3 giây;
- mỗi step timeout mặc định 10 giây, có thể cấu hình.

### 15.2 Độ ổn định
- test runner không làm crash toàn hệ thống nếu 1 run fail;
- artifact vẫn được lưu nếu fail giữa chừng.

### 15.3 Bảo mật
- không log secrets ở dạng plain text nếu có thể;
- support basic secret masking cho password step;
- hạn chế SSRF bằng allowlist domain nếu sản phẩm triển khai multi-tenant.

### 15.4 Quan sát hệ thống
- có run ID;
- có structured logs;
- có khả năng truy lại input, DSL, kết quả, lỗi.

---

## 16. Chỉ số thành công của MVP
Các chỉ số nên đo:

1. **Parse success rate**
   - tỷ lệ input hợp lệ được parse đúng schema.

2. **Execution success rate trên happy path**
   - với bộ demo app chuẩn, test pass ổn định.

3. **Time to first test**
   - thời gian để người dùng tạo và chạy test đầu tiên.

4. **Maintenance effort**
   - số lần phải sửa test khi UI thay đổi nhỏ.

Mục tiêu ban đầu:
- 80%+ test demo use cases parse đúng;
- 90%+ test stable trên môi trường demo nội bộ;
- tạo test đầu tiên trong dưới 10 phút.

---

## 17. Giả định và ràng buộc

### 17.1 Giả định
- ứng dụng mục tiêu có UI tương đối semantic;
- phần lớn element có text, label, placeholder hoặc role rõ ràng;
- người dùng chấp nhận cú pháp semi-structured English.

### 17.2 Ràng buộc
- chưa xử lý tốt UI động quá phức tạp;
- chưa hỗ trợ các flow chống bot/captcha;
- chưa hỗ trợ fully free-form natural language;
- chưa hỗ trợ scale enterprise ở MVP.

---

## 18. Stack công nghệ đề xuất

### 18.1 Backend
- Node.js + TypeScript hoặc Python + FastAPI

**Khuyến nghị:** Node.js + TypeScript để gần Playwright hơn.

### 18.2 Frontend
- React / Next.js

### 18.3 Test automation
- Playwright

### 18.4 Database
- PostgreSQL cho production-like MVP;
- SQLite nếu cần chạy local nhanh.

### 18.5 Parser
- đầu tiên: rule-based parser;
- giai đoạn sau: LLM adapter với JSON schema enforcement.

---

## 19. Lộ trình triển khai đề xuất

### Phase 1 - Prototype core
Thời gian: 1-2 tuần
- thiết kế DSL;
- làm parser rule-based cho 5-8 action;
- chạy được Playwright basic flow;
- log pass/fail ở console.

### Phase 2 - MVP usable
Thời gian: 2-4 tuần
- UI nhập test;
- lưu test case;
- run test từ UI;
- screenshot khi fail;
- lịch sử run cơ bản.

### Phase 3 - MVP+ ổn định hơn
Thời gian: 2-4 tuần
- improve locator resolution;
- retry logic;
- password masking;
- parse preview;
- trace/video optional.

---

## 20. Rủi ro chính và cách giảm thiểu

### Rủi ro 1: Người dùng nhập câu quá mơ hồ
**Giảm thiểu:**
- giới hạn cú pháp ở MVP;
- có guideline và template mẫu;
- parser trả error rõ ràng.

### Rủi ro 2: Không tìm được element ổn định
**Giảm thiểu:**
- ưu tiên semantic locator;
- cho phép config alias;
- thêm fallback strategy.

### Rủi ro 3: LLM parse không ổn định
**Giảm thiểu:**
- không phụ thuộc hoàn toàn vào LLM trong MVP;
- enforce JSON schema;
- fallback về parser rule-based.

### Rủi ro 4: Sản phẩm bị đánh giá thấp vì chưa “magic” như testRigor
**Giảm thiểu:**
- định vị rõ đây là MVP;
- tập trung demo value vào speed + readability;
- chưa hứa self-healing hoàn chỉnh ở giai đoạn đầu.

---

## 21. Đề xuất phạm vi demo đầu tiên
Nên có một demo app đơn giản với các flow sau:
- login;
- logout;
- create item;
- search item;
- add to cart;
- checkout giả lập.

Các flow này đủ để chứng minh:
- open/click/type/assert;
- xử lý form;
- xác thực text/url;
- giá trị của natural language testing.

---

## 22. Tiêu chí hoàn thành MVP
MVP được coi là hoàn thành khi đáp ứng đủ các điều kiện sau:

1. Có UI để tạo, sửa, chạy test case.
2. Hỗ trợ tối thiểu 8 action phổ biến.
3. Parse được input semi-structured English sang DSL hợp lệ.
4. Chạy được test trên web app bằng Playwright.
5. Có run report với step status.
6. Có screenshot khi fail.
7. Có thể demo end-to-end ít nhất 3 flow business khác nhau.

---

## 23. Hướng phát triển sau MVP
Sau khi MVP ổn định, roadmap nên ưu tiên:
1. self-healing level 1 bằng fuzzy locator matching;
2. reusable variables và test data;
3. assertions nâng cao;
4. shared test steps;
5. LLM-assisted free-form parsing;
6. API testing;
7. CI integration;
8. multi-browser và parallel execution;
9. visual locator / AI vision;
10. autonomous test generation.

---

## 24. Kết luận
Phiên bản MVP nên được định nghĩa theo hướng **hẹp nhưng chạy thật**:
- chỉ web;
- chỉ một bộ action phổ biến;
- input natural language có quy ước;
- execution bằng Playwright;
- reporting đủ để debug.

Thay vì cố tái tạo toàn bộ độ phức tạp của testRigor ngay từ đầu, MVP cần chứng minh một luận điểm rõ ràng:

> người dùng có thể viết test nhanh hơn bằng ngôn ngữ tự nhiên có cấu trúc, và hệ thống có thể chuyển đổi chúng thành test thực thi được với độ ổn định chấp nhận được.

Đây là nền tảng đúng để phát triển tiếp sang một nền tảng AI-native test automation hoàn chỉnh.
