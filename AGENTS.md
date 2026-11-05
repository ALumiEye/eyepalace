# Eye Palace — quy tắc cho trợ lý AI

Đọc file này trước khi sửa bất cứ thứ gì có ảnh hưởng tới hình ảnh, chữ hiển thị hoặc âm thanh.
Áp dụng cho mọi model và mọi công cụ (Claude Code đọc qua `CLAUDE.md`, Codex/GPT đọc file này).

> Phần **Nhận diện ALumiEye** được chép từ `../AGENTS.md` (thư mục `eyegame`, dùng chung cho mọi game).
> Sửa quy tắc chung thì sửa ở **cả hai file**.

## Nhận diện ALumiEye (chung cho eyepalace, eyetank, eyerush, eyerim)

**Logo**
- Logo thật: con mắt trong tam giác, nằm trong vòng tròn tím. File gốc `eyetank/src/client/alumieye.png`
  (eyerush dùng file giống hệt). Trong game này: `assets/alumieye.png`, phải giống từng byte với bản gốc.
- Hiện ở **góc trên trái mọi màn hình** (cả menu lẫn lúc chơi): `<img id="brand" src="assets/alumieye.png" alt="ALumiEye">`,
  `position: fixed`, nền kem, viền tím, bo tròn.
- **Không** tự vẽ logo, **không** dùng `◈`, **không** dùng hình con mắt chung chung, **không** dùng `icon.svg`.
- Favicon là mặt Lumi (`assets/favicon.png`, lấy từ `eyetank/public/favicon.png`).

**Lumi**
- Chỉ dùng ảnh gốc `assets/lumi.png` (từ `eyetank/src/client/lumi.png`), không vẽ lại.
- Luôn vẽ theo tỷ lệ gốc: tính kích thước từ `naturalWidth/naturalHeight` (xem `drawCastle` trong `src/render.js`).
  Không bao giờ ép vào khung khác tỷ lệ.

**Màu** (giá trị chính xác, khai báo trong `:root` của `style.css`)
| Biến | Mã | Dùng cho |
|---|---|---|
| `--cream` | `#efe3cc` | nền thẻ, bảng, thanh bên |
| `--cream-light` | `#f6eddb` | nền nút, ô con |
| `--plum` | `#59325d` | nút chính, tiêu đề, viền logo |
| `--plum-dark` | `#3d2141` | nền trang, HUD, viền, chữ trên nền kem |
| `--orange` | `#eba96b` | mục đang chọn, nút gọi đợt, điểm nhấn |
| `--orange-dark` | `#cf8549` | nửa sau tiêu đề, viền focus |
| `--pink` | `#f2b3ae` | nhãn nhỏ trên chip HUD |

**Thành phần**
- **Nút**: phẳng, `border-radius: 0`, viền 3px `--plum-dark`, `box-shadow: 0 3px 0`; bấm thì lún xuống
  (`translateY(3px)`, bỏ bóng). Nút chính nền `--plum`, chữ kem.
- **Thẻ / bảng**: nền kem, viền 4px `--plum-dark`, bóng đổ lệch cứng, góc vuông.
- **Tiêu đề game**: `<h1><img src="assets/lumi.png" alt="">Eye<span>Palace</span></h1>`, chữ đậm 900,
  "Eye" màu `--plum`, phần sau màu `--orange-dark`, Lumi lắc nhẹ (tắt khi giảm chuyển động).
- **Chip HUD** (giống EyeRush): nhãn chữ in hoa nhỏ màu `--pink` ở trên, số lớn màu kem ở dưới, bo 10px.
- **Chữ**: font hệ thống (`system-ui`), đậm 600. Nhãn bằng **chữ**, ví dụ "Tự gọi", "II", "Âm: Bật", "Menu".

**Cấm** — những thứ từng làm giao diện "nhìn giả"
- Gradient (`linear/radial/conic-gradient`), hiệu ứng kim loại, chữ có chân (Georgia, serif),
  kính mờ (`backdrop-filter`), bo góc nút/thẻ, viền phát sáng.
- Biểu tượng cảm xúc (emoji) trên HUD, menu, nút, tiêu đề. Ký hiệu chữ đơn giản `▶` và `⛶` được phép.

## Ngoại lệ riêng EyeRim (đồng bộ với ../AGENTS.md)

EyeRim giữ UI sci-fi TIDEBREAKER được người dùng duyệt: nền tối, cyan, màu cảnh báo, gradient/glow, bo góc, bố cục menu/HUD và chuyển động. Không đổi toàn bộ nút/thẻ sang kem/tím/cam. Nhận diện ALumiEye là lớp bổ sung gọn: logo gốc góc trên trái mọi màn hình, tên EyeRim tím/cam trên nền kem cùng Lumi đúng tỷ lệ, favicon mặt Lumi. Nhận diện tạo thành **vỏ màn hình điều khiển vuông góc đủ bốn cạnh**: nền kem, viền tím đậm, nhấn cam, logo/tên ở cạnh trên và nhãn máy/khe trang trí/đèn trạng thái ở cạnh dưới. Khung nằm ngoài canvas, không che HUD/cảnh báo; giữ TIDEBREAKER là tiêu đề chính. Logo EyeRim dùng nguyên ảnh đúng tỷ lệ, không thêm vòng viền hoặc `border-radius` cắt mất đỉnh tam giác; ngoại lệ này không đổi cách bọc logo của các game khác. Tài nguyên nhận diện phải có trong cả bản Pages và HTML offline. Ngoại lệ này **không áp dụng cho Eye Palace**.

Gallery public của EyeRim chỉ hiển thị tên Vanguard/Tempest; không đưa tên Striker Eureka/Gipsy Danger hay ảnh tham chiếu ngoài repo lên gallery. Giữ nguyên tạo hình nhân vật.

## Riêng Eye Palace

- **Chiến trường** (vẽ trên canvas, `src/render.js`) giữ tông **tối, vây hãm** theo yêu cầu của người dùng:
  quái mắt đỏ và nanh, cây khô, đường ba làn rộng, thành 3×3 có tường và bốn vọng gác bao quanh Lumi,
  báo động đỏ khi trùm áp sát hoặc thành còn ≤30% máu. Chỉ **khung giao diện** (HUD, thanh bên, menu, lớp phủ)
  theo bộ màu kem/tím/cam ở trên. Đừng "làm sáng" chiến trường nếu người dùng không yêu cầu.
- **Máu thành** phải luôn dễ thấy: chip "MÁU THÀNH x / y" trên HUD và bảng máu lớn cạnh thành trên canvas,
  có cả số lẫn vạch, đổi xanh → vàng (≤60%) → đỏ (≤30%).
- **Nhạc**: combat điện tử thích ứng (`src/audio.js`), 120 / 168 / 180 / 192 BPM theo chuẩn bị / giao tranh /
  trùm / nguy cấp, có build-up, ngắt nhịp rồi drop. Giữ thanh âm lượng nhạc/hiệu ứng riêng.
- **Ngoại lệ đã biết, chưa sửa**: thanh trình vẽ bản đồ (`#editor-bar`) và một số nội dung do JS sinh
  (cẩm nang, mẹo, ngôi sao) vẫn còn biểu tượng cảm xúc. Khi sửa tới đó thì thay bằng chữ, và giữ
  chế độ màn nhỏ còn dùng được.

## Trước khi báo xong việc giao diện

```bash
node tools/style-check.js     # quy tắc nhận diện ở trên — phải đạt
node tools/test.js            # logic game
node tools/browser-check.js   # chạy thật trên Chrome, gồm kiểm tra logo và tỷ lệ Lumi; chụp ảnh vào docs/
node tools/build.js           # dựng lại dist/eyepalace.html
```

Sau đó **mở và xem ảnh chụp** trong `docs/` (menu, giao tranh, nguy cấp, điện thoại). Đạt bài kiểm tra
chưa có nghĩa là đẹp. Khi sửa JS/CSS, tăng số `?v=` trong `index.html`.

## Khi có mâu thuẫn

Yêu cầu trực tiếp của người dùng luôn được ưu tiên hơn file này. Làm theo yêu cầu, rồi **cập nhật file này**
(và `../AGENTS.md` nếu là quy tắc chung) để model sau không làm ngược lại.
