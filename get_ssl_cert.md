Mở git bash và thực thi lệnh sau để tạo một chứng chỉ SSL tự ký (self-signed certificate) cùng với một khóa riêng (private key):
```sh
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes
```
Phân tích từng phần:

---

### **1. `openssl req`**
- Lệnh `openssl` dùng để gọi công cụ OpenSSL.
- `req` (request) chỉ ra rằng ta muốn tạo một **Certificate Signing Request (CSR)** hoặc một chứng chỉ.

---

### **2. `-x509`**
- Tạo một **chứng chỉ tự ký (self-signed certificate)** thay vì chỉ tạo một yêu cầu ký chứng chỉ (CSR).
- Chứng chỉ `x.509` là tiêu chuẩn phổ biến cho các chứng chỉ SSL.

---

### **3. `-newkey rsa:2048`**
- Tạo **một cặp khóa mới** với thuật toán **RSA** có kích thước **2048-bit** (mạnh, bảo mật tốt).
- Nếu không có tùy chọn này, OpenSSL sẽ yêu cầu cung cấp một khóa riêng đã có.

---

### **4. `-keyout key.pem`**
- Lưu **khóa riêng (private key)** vào tệp `key.pem`.

---

### **5. `-out cert.pem`**
- Lưu **chứng chỉ số (SSL certificate)** vào tệp `cert.pem`.

---

### **6. `-days 365`**
- Đặt **thời hạn hiệu lực của chứng chỉ** là **365 ngày**.

---

### **7. `-nodes`**
- Viết tắt của **"No DES encryption"**.
- Nếu không có tùy chọn này, OpenSSL sẽ yêu cầu thiết lập mật khẩu bảo vệ khóa riêng.
- Khi dùng `-nodes`, khóa riêng sẽ **không được mã hóa**, giúp server có thể sử dụng chứng chỉ mà không cần nhập mật khẩu mỗi khi khởi động.

---

Sau khi thực thi câu lệnh trên, bạn có 3 lựa chọn khi nhập thông tin vào từng trường:  

1. **Nhập giá trị mong muốn** → Gõ thông tin rồi nhấn **Enter**  
2. **Bỏ trống trường đó** → Gõ **`.`** rồi nhấn **Enter**  
3. **Chấp nhận giá trị mặc định** → Chỉ cần nhấn **Enter** (không cần nhập `.`)  

---

### **Ví dụ minh họa**  

#### **OpenSSL yêu cầu nhập thông tin:**
```
Country Name (2 letter code) [AU]:
```
- Nếu bạn nhập **VN** rồi nhấn **Enter**, nó sẽ đặt mã quốc gia là **VN**.  
- Nếu bạn chỉ nhấn **Enter**, nó sẽ giữ giá trị mặc định **AU** (Australia).  
- Nếu bạn nhập **`.`** rồi nhấn **Enter**, nó sẽ để trống trường này.  

#### **Ví dụ nhập thông tin cho chứng chỉ**
```
Country Name (2 letter code) [AU]: VN
State or Province Name (full name) [Some-State]: Da Nang
Locality Name (eg, city) []: Da Nang
Organization Name (eg, company) [Internet Widgits Pty Ltd]: My Company
Organizational Unit Name (eg, section) []: .
Common Name (e.g. server FQDN or YOUR name) []: localhost
Email Address []: .
```
- **"Organizational Unit Name"** và **"Email Address"** bị bỏ trống vì nhập `.`  
- **"Common Name"** được đặt là `localhost`, dùng để chạy server trên máy cá nhân.  

---

Lỗi **`net::ERR_CERT_AUTHORITY_INVALID`** xảy ra vì trình duyệt không tin tưởng chứng chỉ SSL tự ký (self-signed certificate) của bạn. Đây là hành vi bình thường vì chứng chỉ của bạn không được cấp bởi một **Certificate Authority (CA)** hợp lệ như Let's Encrypt, DigiCert, v.v.  

---

### 🔹 **Cách khắc phục lỗi `ERR_CERT_AUTHORITY_INVALID`**
#### **1️⃣ Cách tạm thời (cho phát triển) - Bỏ qua cảnh báo trên trình duyệt**
Bạn có thể bỏ qua lỗi này trên trình duyệt **Chrome** hoặc **Edge**:
- Khi truy cập `https://localhost:3000`, bạn sẽ thấy cảnh báo **"Your connection is not private"**.
- Nhấn **"Advanced"** → Chọn **"Proceed to localhost (unsafe)"**.

Trên **Firefox**:
- Vào `about:config` trên thanh địa chỉ.
- Tìm **`security.enterprise_roots.enabled`** và đặt thành **`true`**.
- Thử truy cập lại trang web.

---

#### **2️⃣ Cách chính thức - Thêm chứng chỉ vào hệ thống**
Bạn có thể thêm chứng chỉ vào hệ thống để trình duyệt tin tưởng nó.

##### **🔹 Windows**
1. **Mở "Manage Computer Certificates"**
   - Nhấn `Win + R`, nhập `certmgr.msc`, nhấn Enter.
   
2. **Thêm chứng chỉ vào "Trusted Root Certification Authorities"**
   - Trong cửa sổ **Certificate Manager**, điều hướng đến:
     ```
     Trusted Root Certification Authorities -> Certificates
     ```
   - Click chuột phải → **All Tasks** → **Import**.
   - Chọn file **`cert.pem`** mà bạn đã tạo.
   - Hoàn tất quá trình import.

##### **🔹 macOS**
1. Mở **Keychain Access** (`cmd + space` → tìm "Keychain Access").
2. Chọn **System** → **Certificates**.
3. Kéo file **`cert.pem`** vào danh sách.
4. Click chuột phải vào chứng chỉ vừa thêm, chọn **Get Info**.
5. Chuyển **Trust** → **Always Trust**.

##### **🔹 Linux (Ubuntu/Debian)**
1. Sao chép chứng chỉ vào thư mục CA:
   ```sh
   sudo cp cert.pem /usr/local/share/ca-certificates/mycert.crt
   ```
2. Cập nhật danh sách chứng chỉ:
   ```sh
   sudo update-ca-certificates
   ```

---

#### **3️⃣ Cách khác - Tạo chứng chỉ có "Subject Alternative Name" (SAN)**
Một số trình duyệt (Chrome, Edge) **không chấp nhận** chứng chỉ tự ký nếu không có **Subject Alternative Name (SAN)**.

Bạn có thể tạo chứng chỉ với SAN bằng lệnh OpenSSL sau:

```sh
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```
Lệnh này sẽ giúp trình duyệt chấp nhận chứng chỉ dễ dàng hơn.

---
