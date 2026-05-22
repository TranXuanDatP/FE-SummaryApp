# Kịch bản Test Frontend — Summary UI

> Môi trường: Backend chạy `localhost:3000` + Frontend chạy `localhost:5173`
>
> Vite Proxy tự forward `/auth`, `/users`, `/projects`, `/work-logs`, `/comments`, `/notifications`, `/reports` → backend.

---

## Chuẩn bị

### Bước 1: Start Backend

```bash
cd f:/Workspace/Summary
docker-compose up -d
npm run db:migrate   # (lần đầu hoặc khi có schema mới)
npm run build
NODE_ENV=production node dist/src/main.js
```

Verify: `curl http://localhost:3000/health` → 200

### Bước 2: Seed users (nếu chưa có)

```bash
npm run seed:user:prod -- -e "manager@test.com" -p "password123" -n "Admin User" -r manager
npm run seed:user:prod -- -e "emp@test.com" -p "password123" -n "Employee User" -r employee
```

### Bước 3: Start Frontend

```bash
cd f:/Workspace/summary-ui
npm run dev
```

Truy cập: `http://localhost:5173`

---

## Test Accounts

| Email | Password | Role | Dùng cho |
|-------|----------|------|----------|
| `manager@test.com` | `password123` | **manager** | Test đầy đủ quyền |
| `emp@test.com` | `password123` | **employee** | Test quyền hạn chế |

---

## 1. Login Page (`/login`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 1.1 | Hiển thị form login | Mở `/login` | Thấy form email + password, gradient background, test accounts hiển thị |
| 1.2 | Login thành công (manager) | Nhập `manager@test.com` / `password123` → Sign In | Redirect sang Dashboard, header hiện email + tag "manager" màu xanh |
| 1.3 | Login thành công (employee) | Nhập `emp@test.com` / `password123` → Sign In | Redirect Dashboard, tag "employee" màu xanh lá |
| 1.4 | Sai password | Nhập `manager@test.com` / `wrong` | Alert đỏ "Invalid credentials", vẫn ở trang login |
| 1.5 | Email không tồn tại | Nhập `nobody@test.com` / `password123` | Alert đỏ |
| 1.6 | Validation | Bấm Sign In khi để trống field | Thấy lỗi validation dưới input |
| 1.7 | Redirect khi đã login | Login rồi → mở `/login` | Tự redirect sang Dashboard |
| 1.8 | Loading state | Bấm Sign In → quan sát button | Button hiện spinner, disable không bấm lại được |

---

## 2. App Layout (Sidebar + Header)

**Precondition: Đã login**

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 2.1 | Sidebar menu | Quan sát sidebar | 8 menu items: Dashboard, Users, Projects, Work Logs, Calendar, Comments, Notifications, Reports |
| 2.2 | Navigation | Click "Projects" → Click "Work Logs" | URL đổi, nội dung page đổi, menu highlight đúng item |
| 2.3 | Collapse sidebar | Bấm nút collapse | Sidebar thu nhỏ, icon "S" thay chữ "Summary" |
| 2.4 | User dropdown | Click avatar/email ở header | Dropdown hiện "Logout" |
| 2.5 | Logout | Click Logout | Redirect về `/login`, xoá token localStorage |
| 2.6 | Role badge | Login manager vs employee | Manager: tag blue "manager" / Employee: tag green "employee" |

---

## 3. Dashboard (`/`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 3.1 | Hiển thị stats | Mở Dashboard | 4 card: Users, Projects, Work Logs, This Month (completion %) |
| 3.2 | Monthly detail | Quan sát row thứ 2 | Business Days, Logged Days, Missing (Editable) |
| 3.3 | Recent Work Logs | Quan sát bảng cuối | Bảng 5 work logs gần nhất, cột Date/Content/Project/Status |
| 3.4 | Manager xem tất cả | Login manager | Recent logs hiện cột "Employee" |
| 3.5 | Employee chỉ xem của mình | Login employee | Recent logs không có cột "Employee" (hoặc chỉ data của mình) |

---

## 4. Users Page (`/users`)

**Precondition: Login manager**

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 4.1 | List users | Mở `/users` | Bảng users, hiện tên + email + role + status + version |
| 4.2 | Phân trang | Xem pagination | "X users" ở dưới bảng |
| 4.3 | Tạo user mới | Click "Create User" → điền form → Create | Modal mở, điền email/password/fullName/role → tạo thành công, bảng refresh |
| 4.4 | Email trùng | Tạo user với email đã tồn tại | Lỗi "Email already exists" hiện dưới field email |
| 4.5 | Validation | Bấm Create khi để trống | Lỗi validation hiện |
| 4.6 | Deactivate user | Click "Deactivate" → confirm | Popconfirm hiện → confirm → user status thành "Inactive", nút Deactivate biến mất |
| 4.7 | Filter role | Click filter icon cột Role → chọn "Manager" | Bảng chỉ hiện manager |
| 4.8 | Refresh | Click Refresh | Bảng reload |
| 4.9 | Employee truy cập | Login employee → mở Users | Vẫn xem được (nếu backend cho) hoặc 403 |

---

## 5. Projects Page (`/projects`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 5.1 | List projects | Mở `/projects` | Bảng projects: Name + Description, Status, Version, Updated |
| 5.2 | Tạo project | Click "Create Project" → nhập name → Create | Modal mở → tạo thành công, bảng refresh |
| 5.3 | Tạo trùng tên | Nhập tên project đã tồn tại | Lỗi "Project name already exists" |
| 5.4 | Sửa project | Click "Edit" → sửa name → Update | Modal pre-fill data → update thành công |
| 5.5 | Search | Gõ vào ô search → Enter | Bảng filter theo fuzzy search, text hiện `Search: "..."` |
| 5.6 | Clear search | Click X trên ô search | Bảng hiện lại tất cả |
| 5.7 | Merge (manager) | Click "Merge" trên 1 project active | Modal mở, select multi source projects |
| 5.8 | Merge execute | Chọn source → click Merge | Source projects thành status "merged", target không đổi |
| 5.9 | Merge button ẩn | Login employee | Không thấy nút Merge |
| 5.10 | Project đã merged | Quan sát project merged | Status tag màu vàng "merged" |

---

## 6. Work Logs Page (`/work-logs`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 6.1 | List work logs | Mở `/work-logs` | Bảng: Date, Content, Project, Employee, Status (Editable/Locked/Unlocked) |
| 6.2 | Tạo work log | Click "Create Work Log" → form hiện smart defaults (project gợi ý, date hôm nay) | Modal pre-fill date + project |
| 6.3 | Tạo thành công | Nhập content → Create | Toast success, bảng refresh, entry mới xuất hiện |
| 6.4 | Trùng ngày | Tạo work log cùng project + ngày | Lỗi "A work log already exists for this employee/project/date" |
| 6.5 | Ngày tương lai | Chọn date tương lai → Create | DatePicker disable future dates |
| 6.6 | Sửa work log | Click "Edit" trên entry editable | Modal mở, chỉ sửa được content (project/date disabled) |
| 6.7 | Sửa khi locked | Quan sát entry cũ (> 3 ngày) | Không có nút Edit, chỉ hiện "Locked" tag |
| 6.8 | Xóa work log | Click "Delete" → confirm | Popconfirm → xóa thành công |
| 6.9 | Unlock (manager) | Click "Unlock" trên entry locked | Modal yêu cầu reason → unlock thành công → status thành "Unlocked" |
| 6.10 | Employee không unlock | Login employee | Không thấy nút Unlock |
| 6.11 | Filter | Click "Filters" → chọn project + date | Bảng filter, badge "(active)" trên nút |
| 6.12 | Clear filters | Click "Clear filters" | Bảng hiện lại tất cả |

---

## 7. Calendar Page (`/calendar`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 7.1 | Hiển thị calendar | Mở `/calendar` | Ant Design Calendar, month hiện tại, 4 stat cards |
| 7.2 | Day indicators | Quan sát các ô ngày | Done (xanh) / Missing (vàng) / Past (xám) / Non-business (trống) |
| 7.3 | Click ngày missing | Click ngày vàng "Missing" | Modal mở để tạo work log |
| 7.4 | Click ngày đã log | Click ngày xanh "Done" | Không mở modal (đã có log) |
| 7.5 | Click cuối tuần | Click ngày không business day | Không mở modal |
| 7.6 | Tạo từ calendar | Nhập content → chọn project → Create | Toast success, ô ngày chuyển thành "Done" |
| 7.7 | Tháng trước | Chuyển sang tháng trước | Calendar data load lại, stats cập nhật |
| 7.8 | Manager: filter employee | Login manager → chọn employee ở dropdown | Calendar hiển thị data của employee đó, không mở modal tạo |
| 7.9 | Manager: clear filter | Xóa dropdown employee | Quay về calendar của mình, có thể tạo log |
| 7.10 | Completion stat | Quan sát stat "Completion" | Phản ánh đúng % logged/total business days |

---

## 8. Comments Page (`/comments`)

**Precondition: Phải có work logs đã tạo**

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 8.1 | List work logs + comments | Mở `/comments` | Bảng work logs, cột Comments hiện inline |
| 8.2 | Work log chưa có comment | Quan sát entry chưa comment | Hiện "No comments" + nút "Add comment" (manager) |
| 8.3 | Manager: thêm comment | Click "Add comment" trên work log | Modal mở, workLogId đã pre-select |
| 8.4 | Manager: thêm từ nút trên | Click "Add Comment" trên header | Modal mở, phải tự chọn work log từ dropdown |
| 8.5 | Tạo comment thành công | Chọn work log → nhập comment → Add | Toast success, comment hiện inline dưới work log đó |
| 8.6 | Comment hiển thị | Quan sát comment | Hiện manager name + content |
| 8.7 | Manager: sửa comment | Click icon Edit trên comment của mình | Modal mở, pre-fill content → update thành công |
| 8.8 | Manager: xóa comment | Click icon Delete → confirm | Popconfirm → xóa, comment biến mất |
| 8.9 | Employee: chỉ xem | Login employee | Không thấy nút Add/Edit/Delete, chỉ thấy comments |
| 8.10 | Employee info banner | Login employee | Card "Only managers can create, edit, and delete comments" |

---

## 9. Notifications Page (`/notifications`)

**Precondition: Phải có notifications (trigger từ comment, reminder...) hoặc test với data có sẵn**

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 9.1 | List notifications | Mở `/notifications` | Bảng: Status (New/Read), Type, Title, Content, Time |
| 9.2 | Unread badge | Có notification chưa đọc | Badge đếm số unread, header hiện "X unread" |
| 9.3 | Mark 1 as read | Click "Mark read" | Notification chuyển status Read, badge giảm |
| 9.4 | Mark all read | Click "Mark All Read" | Tất cả thành Read, badge = 0, header "All caught up" |
| 9.5 | Tab Preferences | Click tab "Preferences" | Hiển thị danh sách preference cards |
| 9.6 | Toggle preference | Bật/tắt Switch | Toast success, trạng thái cập nhật |
| 9.7 | Empty state | Không có notification | Empty "No notifications" |

---

## 10. Reports Page (`/reports`)

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 10.1 | Hiển thị báo cáo | Mở `/reports` | Bảng: Date, Employee, Project, Content, Status, Comments |
| 10.2 | Chọn tháng khác | Click date picker → chọn tháng khác | Bảng reload data tháng mới, text cập nhật |
| 10.3 | Export Excel | Click "Export Excel" | File `.xlsx` download, tên `BaoCao_ThangMM_YYYY.xlsx` |
| 10.4 | Manager: filter employee | Chọn employee từ dropdown | Bảng filter, chỉ hiện data employee đó |
| 10.5 | Manager: filter project | Chọn project từ dropdown | Bảng filter thêm |
| 10.6 | Clear filters | Click "Clear filters" | Bảng hiện lại tất cả |
| 10.7 | Employee: không filter | Login employee | Không thấy filter bar, chỉ thấy data của mình |
| 10.8 | Empty month | Chọn tháng chưa có data | Empty "No data for ..." |
| 10.9 | Comments inline | Quan sát cột Comments | Nếu work log có comment → hiện "managerName: content" |

---

## 11. Auth Flow — Token Refresh

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 11.1 | Auto refresh | 1. Login → 2. Đợi accessToken hết hạn → 3. Click vào bất kỳ page nào | Page load bình thường, KHÔNG redirect về login, KHÔNG đứng. Token tự refresh |
| 11.2 | Multiple concurrent refresh | Tạo nhiều tab, tất cả gọi API khi accessToken hết hạn | Chỉ 1 lần gọi `/auth/refresh`, tất cả tab hoạt động bình thường |
| 11.3 | Refresh token hết hạn | Xoá cả refreshToken trong localStorage, chờ accessToken hết hạn → thao tác | Redirect về `/login` |
| 11.4 | Logout xóa token | Click Logout → kiểm tra localStorage | `accessToken` và `refreshToken` đã bị xoá |

---

## 12. Private Route Protection

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 12.1 | Truy cập trang protected khi chưa login | Mở `/work-logs` khi chưa login | Redirect sang `/login` |
| 12.2 | Token rác trong localStorage | Set `accessToken` = "garbage" → mở trang | Redirect về login (interceptor nhận 401, refresh fail) |
| 12.3 | Direct URL access | Login → copy URL `/projects` → mở tab mới cùng URL | Nếu còn token → vào thẳng page. Nếu hết → login |

---

## 13. Responsive & UX

| # | Test Case | Steps | Expected |
|---|-----------|-------|----------|
| 13.1 | Sidebar collapse ở mobile | Thu nhỏ window < 992px | Sidebar tự collapse |
| 13.2 | Table overflow | Mở bảng có nhiều cột ở màn hình nhỏ | Table cuộn ngang, không bị tràn |
| 13.3 | Modal close | Mở modal → bấm X → mở lại | Form reset, không giữ data cũ |
| 13.4 | Loading states | Mở page → quan sát | Spinners hiện trong lúc load, bảng không "nhảy" |
| 13.5 | Code splitting | Mở Network tab → navigate giữa các page | Mỗi page chỉ load chunk riêng (3-13KB), không load lại toàn bộ app |

---

## Tổng kết

| Page | Test Cases | Role cần |
|------|-----------|----------|
| Login | 8 | Public |
| Layout | 6 | Any |
| Dashboard | 5 | Manager + Employee |
| Users | 9 | Manager |
| Projects | 10 | Manager (merge) |
| Work Logs | 12 | Manager + Employee |
| Calendar | 10 | Manager + Employee |
| Comments | 10 | Manager (create) + Employee (view) |
| Notifications | 7 | Any |
| Reports | 9 | Manager (filters) + Employee |
| Auth Flow | 4 | Any |
| Route Protection | 3 | Public + Any |
| Responsive | 5 | Any |
| **Total** | **98** | |

---

## Thứ tự chạy test recommended

```
1. Login (verify auth flow)
2. Dashboard (verify stats load)
3. Users (create user mới để test)
4. Projects (tạo + merge)
5. Work Logs (CRUD + unlock)
6. Calendar (tạo từ calendar + xem stats)
7. Comments (manager thêm/sửa/xóa → employee chỉ xem)
8. Notifications (mark read + preferences)
9. Reports (filter + export Excel)
10. Auth flow (token refresh)
11. Route protection
12. Responsive
```
