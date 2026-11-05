# Eye Palace – Nhật ký & kế hoạch

Game thủ thành (tower defense) HTML5 Canvas, JS thuần, không cần build. Mở `index.html` hoặc chạy
`python3 -m http.server` trong thư mục này. Mô phỏng cân bằng: `node tools/sim.js <map> <diff> <số ván>`.

## v9.6 — Giữ style khi đổi model (2026-11-05)
- Thêm `AGENTS.md` (Codex/GPT đọc) + `CLAUDE.md` (`@AGENTS.md`, Claude Code đọc) ở `eyepalace/` và bản chung ở `eyegame/` cho cả bốn game: logo, 7 mã màu, kiểu nút/thẻ/tiêu đề/chip HUD, danh sách cấm, phần riêng Eye Palace (chiến trường tối, máu thành, nhạc), lệnh kiểm tra và quy tắc khi mâu thuẫn. Bản trong eyepalace đi theo repo git; bản `eyegame/` chỉ ở máy.
- Thêm `tools/style-check.js` (18 mục, đọc tĩnh): logo `#brand` đúng file và giống từng byte bản EyeTank, không icon.svg/◈, 7 mã màu, không gradient/serif/backdrop-filter, nút góc vuông + bóng cứng, không emoji trên HUD/menu/nút, Lumi vẽ theo tỷ lệ gốc. Thử phá trên bản sao tạm: gradient, xoá logo, đổi màu plum, emoji trên nút, chữ có chân → đều bị bắt.
- Dọn để bài kiểm tra đạt thật: bỏ 3 gradient cũ bị ghi đè, kính mờ ở lớp phủ, quy tắc `.brand`/`.grad` không dùng, emoji ở nút "Nhảy +5 đợt" và mẹo cẩm nang. Thanh trình vẽ còn emoji, ghi là ngoại lệ đã biết. Query v111.

## v9.5 — Đúng logo & nhận diện ALumiEye (2026-11-05)
- Phản hồi: UI xấu, nhìn giả, sai logo. Logo đúng là mắt trong tam giác/vòng tròn tím (`eyetank/src/client/alumieye.png`, giống hệt EyeRush). Chép sang `assets/alumieye.png`, hiện cố định góc trên trái mọi màn hình như EyeTank/EyeRush. Bỏ `icon.svg` (con mắt chung chung) và chữ `◈ EYE PALACE`; favicon dùng mặt Lumi giống EyeTank.
- Giao diện dùng bộ màu chung (kem #efe3cc, tím mận #3d2141/#59325d, cam #eba96b/#cf8549, hồng #f2b3ae): nút phẳng viền 3px bóng đổ cứng lún khi bấm, thẻ/bảng viền 4px, tiêu đề Eye**Palace** đậm 900 kèm Lumi. Bỏ gradient, kim loại giả, chữ có chân, bo góc, kính mờ.
- HUD theo chip EyeRush (nhãn hồng nhỏ + số): ĐỢT / VÀNG / MÁU THÀNH / QUÁI; nút chữ thay biểu tượng cảm xúc (Tự gọi, II, Âm: Bật/Tắt, Nhạc, Menu). Thẻ tạm dừng, nút menu, tiêu đề cẩm nang/thành tựu/phím tắt và màn kết thúc cũng bỏ biểu tượng cảm xúc.
- Điện thoại: số liệu một dòng cạnh logo, nút xuống dòng sát mép trái. Đo trang 390×844 mới tải: cao đúng 844 px, một HUD, nút 2 hàng.
- Chưa đổi: chiến trường vẽ canvas vẫn tông tối vây hãm theo yêu cầu trước; nội dung do JS sinh (ngôi sao, cẩm nang, mẹo) vẫn còn vài biểu tượng cảm xúc; bố cục điện thoại vẫn trống nhiều quanh bản đồ.
- 64/64 logic, toàn bộ Chrome browser-check đạt (thêm kiểm tra logo ở bản thường và bản một file), không lỗi console; build ~341 KB, query v110, cache SW v4.

## v9.4 — Combat điện tử dồn dập (2026-11-05)
- Theo yêu cầu nhạc căng/high dopamine: phối lại thành bass offbeat (sub + saw), synth ngắn lọc quét, kick/breakbeat, snare có thân trầm, hi-hat kép ở nguy cấp; không chỉ tăng gain. Giữ gain nhạc 1,6 và slider cũ.
- Tempo chuẩn bị/giao tranh/trùm/nguy cấp: 120/168/180/192 BPM; chu kỳ 8 ô nhịp có snare roll + noise riser, ngắt nửa phách cuối rồi drop kick/crash. Lớp synth bè và nhịp đảo tăng ở trùm/nguy cấp.
- Audio-check render 20 giây/mức, phủ chu kỳ build/drop: đủ tín hiệu, mute/volume 0 im lặng, nguồn phát dọn sạch, tab ngủ không phát bù. Peak stress nhạc 100% + SFX khoảng 0,962 (<1) trong bài thử; không suy ra chất lượng nghe từ RMS. Kiểm tra cấu trúc tempo/build/ngắt/drop đạt.
- 64/64 logic và toàn bộ Chrome browser-check đạt, AudioContext thật chạy/chuyển mức, không lỗi console; standalone build ~307 KB, query v109.

## v9.3 — Giữ đúng tỷ lệ Lumi (2026-11-05)
- Ảnh Lumi gốc vuông 256×256 nhưng trước đó vẽ 50×56 nên bị kéo dọc. Nay lấy tỷ lệ từ naturalWidth/naturalHeight và fit trong khung 56×56, giữ vị trí giữa sân.
- Browser-check xác nhận tỷ lệ drawImage khớp ảnh gốc; đã xem ảnh giao tranh, toàn bộ browser-check đạt, không lỗi console. Build lại standalone ~305,2 KB; query v108.

## v9.2 — Máu thành dễ nhìn (2026-11-05)
- Thêm bảng máu 180×48 đơn vị canvas cạnh thành Lumi, số hiện tại/tối đa và vạch đầy; xanh → vàng (≤60%) → đỏ (≤30%), nhãn THÀNH NGUY CẤP khi thấp. Thành sát trên chuyển bảng xuống dưới; bảng vẽ cuối để không bị quái, đêm tối hay hiệu ứng che.
- HUD thay biểu tượng tim đơn lẻ bằng ô MÁU THÀNH, số lớn hiện tại/tối đa và thanh đầy, giữ rõ trên điện thoại; thêm ngữ nghĩa progressbar cho trình đọc màn hình.
- Kiểm tra 64/64 logic và Chrome browser-check đạt: đủ/nửa/nguy cấp/0 máu, không lỗi console, mobile 390px không tràn ngang, mọi bản đồ render và standalone mở trực tiếp. Đã xem ảnh desktop nguy cấp và mobile; build ~305 KB, query v107.

## v9.1 — Tăng riêng âm lượng nhạc (2026-11-05)
- Theo phản hồi nhạc vẫn nhỏ: tăng gain phối nhạc từ 1 lên 1,6 (+60% trước compressor), giữ nguyên gain SFX/môi trường và mức slider đã lưu.
- Audio-check đạt: RMS giao tranh tại slider 70% khoảng 0,143 (bản v9.0 khoảng 0,094); bài thử nguy cấp 100% + nhiều SFX peak khoảng 0,823 (<1). Mute/volume 0 và dọn nguồn phát đạt. Build lại standalone ~302,1 KB; cache query v106.

## v9.0 — Nhạc chiến trận nổi rõ, dồn dập (2026-11-05)
- Thay arpeggio ngũ cung nhẹ bằng mô-típ dây tối, bass nhịp, hợp âm thứ, kick/tom/snare/hat và kèn báo nguy tổng hợp; không tải file nhạc ngoài.
- Bốn cấp nhạc: chuẩn bị 100 BPM, giao tranh 132, trùm 148, báo động thành 160. Tạm dừng/kết thúc trở về nền chuẩn bị, không tiếp tục trống dồn; tốc độ game x1–x4 không tăng tốc nhạc.
- Giữ lựa chọn âm lượng cũ của người chơi; tăng độ đầy/độ nổi ngay trong phối khí, không nhân tiếng môi trường. Hai nhánh nhạc/SFX đi qua compressor chung; mute tổng nay tắt luôn cả môi trường.
- Tắt nhạc dừng và tháo toàn bộ nguồn đã hẹn; tab ngủ lâu bỏ nhịp cũ thay vì phát bù. Slider chuyển gain mượt để tránh tiếng click.
- Kiểm tra: 64/64 test logic; `tools/audio-check.js` dùng OfflineAudioContext thật trên Chrome: RMS giao tranh khoảng 0,094 so với 0,0072 của nhạc cũ ở cùng 70%; đây là phép đo tín hiệu, không phải đánh giá nghe bằng tai. Peak bài thử nhạc nguy cấp 100% + nhiều SFX khoảng 0,76 (<1); volume 0/mute cho tín hiệu 0.
- Browser-check: chơi/xây/gọi đợt thật, nhạc chạy trong AudioContext, chuyển mức trùm/nguy cấp, pause, mute, bật/tắt và slider lưu đúng; không lỗi JS/console. Bản standalone mở file trực tiếp được; build ~302 KB, cache query v105.

## Đã xong (v0.1)
- 4 bản đồ (1 bản có 2 cổng), 3 độ khó, 30 đợt + chế độ vô tận, trùm mỗi 10 đợt
- 6 tháp × 3 cấp: Cung, Pháo (nổ lan), Băng (làm chậm), Sét (nảy), Ngắm (xuyên giáp), Mắt Thần (tia tích luỹ)
- 8 loại quái: thường, nhanh, giáp, bay (bay thẳng), pháp sư hồi máu, nhớt tách đôi, trùm
- Chế độ nhắm mục tiêu, nâng cấp/bán, gọi đợt sớm có thưởng, tốc độ x1/x2/x3, tạm dừng
- Lưu ván giữa các đợt, kỷ lục theo bản đồ/độ khó, âm thanh tổng hợp WebAudio

## v0.2
- Lưới chỉ vẽ trên ô xây được; vẽ đường bay của quái bay (nét đứt tím)
- Sửa lỗi: sát thương liên tục (Mắt Thần) bị giáp trừ theo từng khung hình -> giờ trừ theo giây
- Cân bằng: Băng giảm sát thương, Mắt Thần & Sét tăng; giáp tăng chậm hơn theo đợt; Thường hp x1.08
- Quái bay giảm tốc trên đường bay ngắn (thời gian bay ≈ 60% đi bộ) – sửa bản Hẻm Núi không thể thắng
- Kỹ năng chủ động: ☄️ Thiên Thạch (Q, chọn vị trí) và ❄️ Băng Giá (W), có hồi chiêu, rung màn hình
- HUD: số quái còn lại + thanh tiến độ đợt
- Bot mô phỏng tính cả độ phủ đường bay

## v0.3
- Tooltip quái khi rê chuột (máu, giáp, tốc độ, đặc tính)
- Nhánh chuyên môn cấp 4 cho cả 6 tháp (12 nhánh): Liên Châu/Xuyên Giáp, Pháo Cối/Pháo Lửa,
  Bão Tuyết/Băng Phong, Lưới Sét/Quá Tải, Ám Sát/Liên Thanh, Huỷ Diệt/Nhãn Ấn
- Hiệu ứng trạng thái mới: choáng, đốt, dấu ấn (+30% sát thương nhận), chí mạng; trùm chỉ bị choáng 30%
- Lưu/tải ván giữ nhánh đã chọn

## v0.4
- Quái mới: 👻 Bóng Ma (tàng hình – chỉ lộ trong tầm Mắt Thần hoặc khi đi sát tháp),
  🐀 Chuột Chũi (chui xuống đất 1.5s mỗi 4.5s, nhanh hơn & miễn sát thương khi dưới đất)
- Cân bằng: Thường hp x1.25, Khó x1.55; trùm 1150 máu & trừ 6 mạng; Ngã Ba Sông +80 vàng khởi đầu
- Bot mô phỏng chọn nhánh ngẫu nhiên

## v0.5
- Sao theo bản đồ & độ khó (3⭐ ≥90% máu, 2⭐ ≥50%, 1⭐ thắng), hiện trên thẻ bản đồ & màn thắng
- Màn hướng dẫn 5 bước cho lần chơi đầu (nút ? để xem lại)
- Cảm ứng: chạm 1 lần xem trước vị trí, chạm lần 2 để xây

## v0.6
- Quái mới: 🛡 Hiệp Sĩ Khiên – chặn 3 phát bắn đơn đầu tiên (+1 mỗi 8 đợt); sát thương lan & tia liên tục xuyên khiên
- Bản đồ thứ 5: Đầm Lầy Sương – 3 cổng (trái, trái-dưới, trên), +140 vàng khởi đầu
- Cổng quái có thể nằm ở mép trên

## v0.7
- Quái mới: 🐉 Rồng Con – bay, có giáp, trừ 2 mạng (đợt chẵn từ 16)
- Màn kết thúc hiện top 3 tháp gây sát thương nhiều nhất
- Nhạc nền tổng hợp (arpeggio ngũ cung, nhanh hơn khi có đợt quái) – nút 🎵 / phím N
- AudioContext tự resume khi người chơi tương tác

## v0.8
- Mỗi nhánh cấp 4 có hình dáng riêng (3 mũi tên, cung đỏ, nòng cối, nòng lửa, lõi băng, 3 cột sét,
  cầu sét đỏ, tia laser ngắm, nòng đôi, mống mắt đỏ, hào quang)
- Nút 🔁 / phím A: tự động gọi đợt kế tiếp (ghi nhớ lựa chọn)

## v0.9
- Sửa logo 👁 bị nhuộm gradient; lưới 5 bản đồ xếp đều 1 hàng
- Bố cục điện thoại: HUD xuống dòng, nút nhỏ gọn; sửa nút kỹ năng bị bóp còn 18px
- Liên kết nhanh `index.html?play=<0-4>&diff=<easy|normal|hard>` để vào thẳng bản đồ

## v1.0
- 🌙 Đợt Đêm tối (đợt 5, 12, 19, 26…): tầm tháp -20% trừ Mắt Thần; lớp tối với quầng sáng quanh tháp
- Đã kiểm thử luồng chơi bằng sự kiện chuột/phím thật: hướng dẫn, xây (nút & phím), chặn xây trên đường,
  chọn/nâng cấp/đổi mục tiêu/bán, gọi đợt, tốc độ, tạm dừng – không lỗi

## v1.1
- 🏅 12 thành tựu (lưu vĩnh viễn), thông báo toast khi mở khoá, xem trong menu
- Đo hiệu năng: 273 quái + 60 tháp cấp 4 → vẽ ~2.7ms, cập nhật ~0.4ms/khung (DPR 2) – chưa cần cache sprite
- Thêm `?v=` vào đường dẫn JS/CSS để trình duyệt không dùng bản cũ trong cache (tăng số mỗi khi cập nhật)

## v1.2
- 📖 Cẩm nang trong menu: 12 quái (hình, chỉ số, mẹo) & 6 tháp (kèm 2 nhánh cấp 4); liên kết `#book`, `#achievements`
- README.md: cách chơi, phím tắt, cấu trúc mã

## v1.3
- 🎯 Thử thách (chọn ở menu): Cuồng Phong, Khốn Khó, Mong Manh, Tay Không, Không Hối Hận, Vĩnh Dạ
- Điểm số = (đợt×100 + quái×2 + máu×40) × hệ số thử thách × độ khó; kỷ lục điểm theo bản đồ
- Lưu/tải ván & chơi lại giữ nguyên thử thách

## v1.4
- ↶ Hoàn tác (nút / phím Z): xây, nâng cấp, bán trong giai đoạn chuẩn bị – hoàn 100%
- Rê chuột lên nút tháp hiện thông tin tháp ở bảng bên
- `MODS=fast,poor node tools/sim.js …` – cân bằng hệ số điểm thử thách theo kết quả sim
  (trung bình đợt đạt được: gốc 28.8, Cuồng Phong 27.2, Khốn Khó 23.7, Mong Manh 28.5, Vĩnh Dạ 27.9)

## v1.5
- DPS ước tính trong bảng tháp (kèm DPS cấp kế tiếp & trên nút chọn nhánh)
- Màn kết thúc: biểu đồ máu cung điện theo đợt (SVG)

## v1.6
- 🚩 Tháp thứ 7 Đài Chỉ Huy (phím 7): tăng sát thương & tốc bắn tháp trong tầm (không cộng dồn);
  nhánh Chiến Kỳ (+45%/+20%) hoặc Kho Bạc (+30% & +70 vàng mỗi đợt). Tháp được tăng có mũi tên hồng.
- Chỉ số tháp dùng `stats` (đã cộng hiệu ứng, có cache) và `baseStats` (gốc)

## v1.7
- 💰 Rương vàng: 3% quái (100% trùm) rơi rương, nhấn để nhặt (12 + đợt×3 vàng, trùm x5), mất sau 8 giây

## v1.8
- Bản đồ 6: 🍂 Ngã Tư Lá Đỏ – đường tự giao cắt, cây lá đỏ; hệ số máu quái riêng theo bản đồ (`hpMul` 1.45)
- ✨ Hiệu ứng thấp (menu tạm dừng): ít hạt, không rung; tự bật 1 lần nếu máy chạy > 28ms/khung

## v1.9
- Thống kê trọn đời trong màn thành tựu: ván, thắng, thua, thời gian chơi, đợt, quái, trùm, vàng
- Tab / Shift+Tab: chọn lần lượt các tháp đã xây

## v2.0
- 🎲 Bản đồ ngẫu nhiên (thẻ thứ 7): đường sinh từ mã số, nút "Đổi bản đồ", liên kết `?play=6&seed=N`,
  máu quái tỉ lệ theo độ dài đường, lưu/tải giữ nguyên mã; `SEED=N node tools/sim.js 6 …`
- Lưới thẻ bản đồ 4 cột

## v2.1
- Bản đồ nhiều cổng: mỗi nhóm quái đi 1 cổng theo đợt (lính thường & trùm vẫn chia đều) →
  mũi tên + số quái báo trước ở từng cổng khi chuẩn bị; Ngã Ba Sông +130, Đầm Lầy +190 vàng khởi đầu

## v2.2
- Lưu ván ngay trước khi gọi mỗi đợt (& khi đóng tab lúc chuẩn bị) → đóng giữa đợt vẫn chơi lại đúng đợt đó
- 💡 Gợi ý ô đặt Tháp Cung đầu tiên (3 ván đầu)

## v2.3
- 🧪 `node tools/test.js`: 31 kiểm thử logic (xây/bán/nâng cấp/nhánh/hoàn tác, giáp, khiên, tàng hình, đào hầm,
  Đài Chỉ Huy, đêm, thử thách, bản đồ ngẫu nhiên, báo cổng, thắng/thua, rương) – tất cả đạt
- Tách thành tựu & cẩm nang sang `js/achievements.js`

## v2.4
- Bảng "Đợt kế tiếp" hiện hình từng loại quái (vẽ 1 lần, cache dataURL), rê chuột xem mẹo
- `node tools/build.js` → `dist/eyepalace.html`: toàn bộ game trong 1 file (~138 KB) để gửi/chia sẻ

## v2.5
- Favicon SVG con mắt, `manifest.webmanifest` (cài như ứng dụng), `sw.js` lưu sẵn 14 file → chơi offline
  (ưu tiên mạng để luôn có bản mới; tăng `CACHE` trong sw.js khi thêm file)
- Bản 1 file nhúng icon dạng data URI, không đăng ký service worker

## v2.6
- ⌨️ Chơi hoàn toàn bằng phím: mũi tên di chuyển con trỏ ô (viền tím), Enter = xây / chọn / nhặt rương / thả thiên thạch
- Gộp xử lý click chuột/cảm ứng/phím vào `App.actAt()`

## v2.7
- 👑 Thanh máu trùm lớn ở đầu màn hình (cộng dồn nếu nhiều trùm)
- Trùm có chiêu GẦM mỗi 8 giây: tháp trong 2 ô bị tê liệt 1.5 giây (Đài Chỉ Huy bị tê cũng mất hiệu ứng)

## v2.8
- Giữ phím R: hiện tầm bắn mọi tháp (màu theo loại tháp)
- Chống bán nhầm: tháp đầu tư ≥ 300 vàng cần bấm Bán 2 lần trong 2 giây khi đang có đợt quái

## v2.9
- Màn kết thúc: biểu đồ % sát thương theo loại tháp
- Trùm xuất hiện: âm thanh riêng, rung màn hình, thông báo "👑 Chúa Quỷ xuất hiện!"

## v3.0
- Trùm đa dạng: 🐲 Long Vương (bay, từ đợt 20) & 👑 Vua Nhớt (vỡ thành 4 Nhớt Mẹ, đợt 30); vô tận xoay vòng 3 trùm
- Thanh máu trùm ghi tên từng trùm; thông báo theo tên trùm; thêm 2 kiểm thử (33 tổng)

## v3.1
- 📅 Thử thách hôm nay: bản đồ ngẫu nhiên + 2 thử thách cố định theo ngày (ai chơi cùng ngày cũng giống nhau),
  kỷ lục điểm theo ngày hiện trên nút

## v3.2
- Màn thành tựu: biểu đồ điểm Thử thách hôm nay 7 ngày gần nhất
- Sim kiểm tra lại cả 6 bản đồ sau khi thêm trùm mới (Thường): đa số thắng, Đầm Lầy khó nhất như thiết kế

## v3.3
- Lửa nòng (muzzle flash) cho Tháp Cung, Pháo, Tháp Ngắm
- Ảnh minh hoạ `docs/screenshot.jpg` trong README

## v3.4
- Dọn code chết (`pathToggle`, biến thừa trong render); quét hàm không dùng
- Tốc độ x4 (tối đa 16 bước mô phỏng/khung để giữ chính xác)

## v3.5
- Thanh trượt âm lượng hiệu ứng & nhạc nền trong menu tạm dừng (2 nhánh GainNode riêng, có ghi nhớ)
- Bảng phím tắt: phím ? hoặc nút trong menu tạm dừng

## v3.6
- Nâng cấp: cột sáng bay lên + chữ "Cấp N" / tên nhánh
- Quái chết: chớp trắng, thu nhỏ & mờ dần 0.35s (tắt ở chế độ hiệu ứng thấp, tối đa 60 xác)
- Sửa: vẽ quái giữ nguyên độ trong suốt gốc (trước đây đặt lại về 1)

## v3.7
- Bản đồ 7: 🌋 Núi Lửa – 12 ô nóng (+25% sát thương cho tháp đặt lên, cộng thêm với Đài Chỉ Huy), vũng dung nham làm vật cản
- Bản đồ ngẫu nhiên dời sang chỉ số 7 (`?play=7&seed=N`); thêm kiểm thử ô nóng (34 tổng)

## v3.8
- Bản đồ ngẫu nhiên có ô nóng ở góc trong khúc cua (~5 ô/bản đồ)
- Bot mô phỏng ưu tiên ô nóng (×1.3 điểm) → Núi Lửa Thường thắng 4/5

## v3.9
- Nút ⛶ toàn màn hình (khoá xoay ngang trên điện thoại nếu được)
- Đã kiểm tra bản đồ ngẫu nhiên có ô nóng trên trình duyệt (mã 777: 7 ô nóng, xây lên được +25%)

## v4.0
- 🏆 Bảng xếp hạng cục bộ 10 ván điểm cao nhất (bản đồ, độ khó, đợt, thử thách, ngày) trong màn thành tựu
- Sửa ô nóng bản đồ ngẫu nhiên nằm đúng góc trong khúc cua (94% giáp 2 ô đường)

## v4.1
- 💾 Xuất / 📂 nhập dữ liệu (mọi khoá `eyepalace.*`) ra file JSON trong màn thành tựu;
  nhập chỉ nhận khoá đúng tiền tố & giá trị JSON hợp lệ

## v4.2
- Rà soát văn bản: thống nhất "cung điện" (bỏ "lâu đài"), "trừ N máu" (bỏ "mạng"),
  dấu phẩy thập phân kiểu Việt trong mô tả & bảng thông số tháp (2,7 thay vì 2.7)

## v4.3
- Màn tạm dừng: bản đồ, đợt, điểm hiện tại, máu, số quái hạ, thời gian, thử thách đang bật
- Sửa điểm: đợt đang đánh chưa được tính là đã qua (thêm kiểm thử, 35 tổng)
- Bỏ mục tối ưu tháp Sét: đo trước đó cho thấy còn dư hiệu năng nhiều (273 quái ≈ 0.4ms/khung)

## v4.4
- Thời tiết trang trí theo bản đồ: tuyết (Xoắn Ốc Băng), lá đỏ (Ngã Tư Lá Đỏ), tàn lửa bay lên (Núi Lửa),
  sương mờ trôi (Đầm Lầy); tắt ở chế độ hiệu ứng thấp; bản đồ ngẫu nhiên theo chủ đề tương ứng

## v4.5
- ✨ Đợt hoàn hảo (không để lọt quái): thưởng (5 + đợt×0.5) vàng, +5% mỗi đợt liên tiếp (tối đa +50%);
  thành tựu "Thành Đồng" cho 10 đợt liên tiếp (13 thành tựu); kiểm thử mới (36 tổng)
- Đã giảm mức thưởng sau sim (mức đầu làm game dễ hơn rõ rệt)

## v4.6
- Lưu/tải bền hơn: ván lưu hỏng bị xoá kèm thông báo; tháp sai loại/ô bị bỏ & hoàn 70%; cấp & nhánh được kẹp hợp lệ;
  thử thách lạ bị lọc; lưu thêm chuỗi đợt hoàn hảo

## v4.7
- Tách lưu/tải sang `Game.serialize()` / `Game.validSave()` / `game.restore()` (không phụ thuộc DOM) + 3 kiểm thử (39 tổng)
- Sửa lỗi: menu bị lỗi khi ván lưu hỏng (đọc tên bản đồ không tồn tại) → giờ tự xoá ván hỏng

## v4.8
- Kiểm tra "dữ liệu rác": ghi giá trị sai kiểu vào mọi khoá localStorage → tìm & sửa 4 lỗi (bản đồ/độ khó/thử thách
  không hợp lệ làm hỏng menu, âm lượng không phải số làm hỏng âm thanh). Thêm `store.num/bool/obj/arr` đọc có kiểm tra kiểu,
  thống kê thành tựu được chuẩn hoá; `upgrade`/`sell` bỏ qua tháp null

## v4.9
- Kiểm tra độ bền chế độ vô tận tới đợt 80 (70 tháp cấp 4): không NaN, tối đa 350 quái, ~0.5ms/bước mô phỏng
- Giới hạn chữ nổi (60) & vòng hiệu ứng (80) để không phình bộ nhớ khi quá đông

## v5.0
- 💡 Gợi ý chiến thuật trong "Đợt kế tiếp" (tối đa 2 dòng): nhắc tháp bắn quái bay, Mắt Thần khi có Bóng Ma,
  Tháp Ngắm cho quái giáp, cách xử lý Hiệp Sĩ Khiên/Pháp Sư/quái nhanh/Chuột Chũi – dựa vào tháp đang có
  (thay cho mục "đội hình gợi ý"); thêm kiểm thử (40 tổng)

## v5.1
- 🌬 Âm thanh môi trường theo bản đồ (tiếng ồn lọc + dao động chậm): gió (Hẻm Núi, Xoắn Ốc), dung nham (Núi Lửa),
  lá rì rào (Đồng Cỏ, Lá Đỏ), nước (Ngã Ba Sông, Đầm Lầy); đi chung nút & âm lượng nhạc nền; dừng khi về menu
  (chưa nghe thử bằng tai – chỉ kiểm tra logic)

## v5.2
- 🐞 Sửa lỗi nghiêm trọng: khi canvas có kích thước 0 (mở ở tab nền / cửa sổ thu nhỏ) lệnh vẽ nền ném lỗi trước khi hẹn khung
  kế tiếp → vòng lặp game dừng vĩnh viễn (đơ). Giờ: kích thước tối thiểu 1px, bỏ qua khung khi chưa có kích thước,
  tự bố trí lại định kỳ / khi tab hiện lại, và `frame()` luôn hẹn khung kế tiếp kể cả khi một khung lỗi
- Kiểm thử vẽ thật: bot chơi 4 ván (Ngã Ba Sông, Núi Lửa, Xoắn Ốc, ngẫu nhiên) có vẽ ~13.500 khung canvas thật,
  chọn tháp, xem tầm, kỹ năng, đêm, trùm – không lỗi; ~0.3ms/khung vẽ

## v5.3
- Quái mới 🧿 Phù Thủy Bóng Đêm (đợt lẻ từ 18): mỗi 5s làm tê liệt tháp gần nhất trong 2 ô suốt 2s (tia phép tím);
  có gợi ý chiến thuật & mục cẩm nang; kiểm thử mới (41 tổng)

## v5.4
- ☠️ Tháp thứ 8 Tháp Độc (phím 8): phi tiêu độc cộng dồn tới 4–7 lớp, sát thương theo thời gian;
  nhánh Dịch Hạch (độc lây khi quái chết) / Axit (giảm 50% giáp quái trúng độc); bong bóng độc trên quái
- Cân bằng sau sim (lần đầu quá yếu – tăng sát thương ~50%); thêm 2 kiểm thử (43 tổng)

## v5.5
- Bố cục cho 8 tháp: lưới nút tháp 3 cột gọn hơn (thanh bên vừa khít 1440×900, trước đây phải cuộn);
  điện thoại dọc 8 nút một hàng; màn thấp (điện thoại xoay ngang) thanh bên thu gọn 210px, ẩn tên tháp
- Xác nhận thành tựu "Bậc Thầy" tự tính đủ 16 nhánh

## v5.6
- Tháp Độc nhắm thông minh: bỏ qua quái đã đủ lớp độc (còn > 1,5s) để rải độc ra nhiều mục tiêu
  → sim: Đồng Cỏ 3/3 thắng (trước 2/3), Ngã Ba Sông đều trụ tới đợt 30; kiểm thử mới (44 tổng)

## v5.7
- Rà cân bằng mức Khó cả 7 bản đồ: Xoắn Ốc Băng quá dễ (6/6 thắng) → hpMul 1.3 (còn 1/6 thắng, đa số thua đợt 29–30).
  Ngã Ba Sông/Đầm Lầy Khó rất khó với bot (bot không đọc báo cổng) – giữ nguyên

## v5.8
- Kiểm tra mức Dễ trên 3 bản đồ khó nhất: thắng 6/6 cả ba (đúng mục đích)
- Cập nhật màn hướng dẫn: phím 1–8, ô nóng, Phù Thủy, gợi ý 💡, rương vàng, phím ?

## v5.9
- Viết lại README cho khớp game hiện tại (8 tháp, 15 quái, 7+1 bản đồ, liên kết nhanh, công cụ); ảnh minh hoạ mới
  (Núi Lửa, đủ 8 loại tháp cấp 4, hai trùm)

## v6.0
- Mũi tên trắng chạy dọc đường chỉ hướng quái đi (lúc chuẩn bị, 3 đợt đầu)
- 🎆 Pháo hoa khi thắng: 4 đợt pháo hoa rồi mới hiện màn chiến thắng

## v6.1
- Bản đồ 8: 👁 Cung Điện Mắt – cung điện ở giữa, 4 cổng từ 4 góc; 🔒 mở khoá sau khi thắng 3 bản đồ cố định
  (thẻ bị khoá hiện tiến độ x/3, thông báo khi mở khoá). Cân bằng sau sim: hpMul 0.72, +330 vàng → Thường thắng 4/6
- Bản đồ ngẫu nhiên chuyển sang chỉ số 8 (`?play=8&seed=N`); cổng quái/đường bay hỗ trợ mép phải

## v6.2
- Ván lưu & bản đồ chọn gần nhất ghi theo mã bản đồ (`mapId`, `lastMapId`) thay vì chỉ số → thêm bản đồ mới
  không làm ván cũ mở nhầm bản đồ (vẫn đọc được bản lưu cũ chỉ có chỉ số); kiểm thử mới (45 tổng)

## v6.3
- 🧪 Thử Nghiệm (sandbox) trong danh sách thử thách: vàng vô hạn để thử đội hình; không tính điểm, kỷ lục,
  sao, bảng xếp hạng, thử thách ngày hay thành tựu; màn kết thúc riêng; kiểm thử mới (46 tổng)

## v6.4
- Thử Nghiệm: nút "⏭ Nhảy +5 đợt" (chỉ hiện ở chế độ này, lúc chuẩn bị) để thử đội hình với đợt muộn/trùm

## v6.5
- Sửa lỗi: Thử thách hôm nay có thể bốc trúng 🧪 Thử Nghiệm (cả ngày không tính điểm) → loại khỏi danh sách bốc;
  kiểm tra 400 ngày liên tiếp không ngày nào trúng

## v6.6
- Bot mô phỏng đọc báo cổng (trọng số độ phủ theo số quái sắp ra ở từng cổng)
- Mức Khó trên bản đồ nhiều cổng giảm 15% máu quái (bot trụ lâu hơn: Ngã Ba Sông tới ~20–26, Cung Điện có ván thắng);
  đợt 20 (2 trùm × 6 máu > 10 máu mức Khó) vẫn là cửa ải chính – giữ theo thiết kế

## v6.7
- ⚠ Cảnh báo nguy hiểm: quái còn < 3 ô tới cung điện → vòng đỏ nhấp nháy quanh cung điện + viền màn hình ửng đỏ;
  trùm thì mạnh hơn kèm dòng "TRÙM SẮP TỚI CUNG ĐIỆN!" (luôn nằm trong màn hình)

## v6.8
- Chuông báo động (1 lần/trùm) khi trùm vào vùng < 3 ô trước cung điện; xác nhận dòng cảnh báo không còn bị cắt mép

## v6.9
- Quái thưởng 💰 Yêu Tinh Vàng (đợt 6, 10, 14…): rất nhanh, 55 vàng khi hạ, lọt không trừ máu & không phá đợt hoàn hảo;
  gợi ý ưu tiên hiện đầu; kiểm thử mới (47 tổng)

## v7.0
- Shift+U: nâng cấp liên tục tháp đang chọn tới cấp 3 (dừng khi hết vàng; nhắc chọn nhánh khi tới cấp 3);
  thêm vào bảng phím tắt & README

## v7.0.1 (kiểm tra)
- Hồi quy vẽ thật lần 2: bot chơi 5 ván (Cung Điện, Núi Lửa, Xoắn Ốc, Hẻm Núi, ngẫu nhiên) với đủ 8 tháp & nhánh,
  quái mới (Độc, Phù Thủy, Yêu Tinh), kỹ năng, rương, cảnh báo, con trỏ phím, bảng bên – ~15.800 khung vẽ, 0 lỗi

## v7.1
- 3 thành tựu mới (16 tổng): 🪙 Kẻ Săn Vàng (10 Yêu Tinh Vàng), 👁 Chủ Nhân Cung Điện (thắng Cung Điện Mắt),
  ☠️ Bậc Thầy Độc Dược (Tháp Độc hạ 300 quái – theo dõi đòn kết liễu `lastHitBy`)

## v7.2
- 🛠 Tự vẽ bản đồ (nút trong menu, thẻ "Bản Đồ Của Bạn" + nút ✏️ Sửa): bấm ô cột trái đặt cổng, bấm ô cùng hàng/cột để
  kéo đường, chuột phải/Backspace hoàn tác, Enter chơi; kiểm tra đường thẳng, không tự đè, ≥ 20 ô; máu quái theo độ dài;
  lưu bền (`customPts`); không tính vào thành tựu Chinh Phục / mở khoá; 2 kiểm thử mới (49 tổng)

## v7.3
- 🔗 Chia sẻ bản đồ tự vẽ: `?custom=<mã>` (mỗi điểm 2 ký tự base-36, VD `098982e2e7j7`); nút "Sao chép liên kết"
  trong trình vẽ & liên kết ở màn kết thúc; mã sai/độc hại bị từ chối; kiểm thử mới (50 tổng)

## v7.4
- Trình vẽ: chế độ 🔥 ô nóng (tối đa 8, ngoài đường đi); ô nóng lưu bền (`customHot`) & đi kèm liên kết (`…-<ô nóng>`)
- Bỏ `prompt()` chặn trang khi không ghi được clipboard → hiện ô chữ chọn sẵn trong thông báo; kiểm thử mới (51 tổng)

## v7.5
- Trình vẽ: ➕ Cổng mới – tối đa 3 cổng; nhánh phụ bắt đầu ở cột trái, đi thẳng, chạm đường chính thì nhập vào (≥6 ô, không đè đường chính trước điểm nhập)
- `validateBranch`, `branchFull`; liên kết `?custom=<chính>.<nhánh>.<nhánh>-<ô nóng>`; lưu `customExtra`
- Cân bằng: máu quái theo tổng số ô đường (mọi nhánh), +40 vàng/cổng phụ (sim: 2 cổng ~ ngang 1 cổng)
- `tools/sim.js` nhận `CUSTOM=<mã>` (map 9); kiểm thử mới (52 tổng); kiểm tra trình duyệt 3 cổng OK

## v7.6
- Thanh trình vẽ hiện ước lượng độ khó trực tiếp: số cổng, hệ số máu quái (dễ/vừa/khó, có màu), vàng thưởng thêm

## v7.7
- Trình vẽ: nút chọn chủ đề (6 loại: Đồng cỏ, Tuyết, Núi lửa, Đầm lầy, Mùa thu, Hẻm đá) – đổi màu, vật trang trí, thời tiết, âm thanh môi trường
- Chủ đề lưu bền (`customTheme`) & đi kèm liên kết (`…~<số>`); mã chủ đề sai → liên kết bị từ chối; kiểm thử mới (53 tổng)

## v7.8
- Màn kết thúc: nút 🛠 "Sửa bản đồ này" khi chơi bản đồ tự vẽ → mở lại trình vẽ với đường/cổng/ô nóng/chủ đề hiện tại

## v7.9 (đo hiệu năng)
- `tools/perf.js`: 40 tháp cấp 3 sát đường + ~300 quái liên tục, x4 → logic trung bình ~2,1 ms/khung hình, tối đa ~9 ms (ngân sách 16,7 ms)
- Trình duyệt (canvas 1440×864, hiệu ứng đầy đủ, >600 hạt+đạn): logic x4 ~1,3 ms + vẽ ~1,5 ms trung bình, vẽ tối đa ~4,6 ms
- Hồ sơ CPU: Game.update 24%, Tower.update 22%, findTarget 14%, Path.posAt 12% – phân bố đều, không có điểm nóng cần tối ưu → giữ nguyên mã

## v8.0
- Cẩm nang: mục 🛠 Mẹo vẽ bản đồ (đường chính, cổng phụ, độ dài ↔ máu quái, ô nóng, chủ đề, chia sẻ)

## v8.1
- Trình vẽ: nút 🎲 Gợi ý – sinh nhanh đường chính hợp lệ + ô nóng ở góc cua (`suggestCustomPath`, dùng lại bộ sinh bản đồ ngẫu nhiên); kiểm thử 200 mã đều hợp lệ (54 tổng)

## v8.2
- Trình vẽ: phím tắt G gợi ý / C cổng mới / H ô nóng / T chủ đề / ? bảng phím (Esc đóng bảng trước, rồi mới thoát); tooltip trên nút; mục riêng trong bảng phím tắt

## v8.3
- Trình vẽ trên màn nhỏ (≤900px rộng hoặc ≤600px cao): nút chỉ còn biểu tượng (chữ đầy đủ + phím tắt trong tooltip), chữ hướng dẫn nhỏ; màn ngang thấp: một hàng nút, hướng dẫn tối đa 2 dòng → chỉ che ~2 hàng ô
- Liên kết `#editor` mở thẳng trình vẽ; kiểm tra ảnh ở 500×860, 860×500, 1280×800

## v8.4
- Khi đang vẽ: thanh bên thay bằng bảng "Bản đồ đang vẽ" (đường chính hợp lệ?, tổng ô, số cổng, ô nóng, chủ đề, máu quái, vàng thêm, quy tắc ngắn); ẩn chỉ số & nút điều khiển đợt trên HUD; màn ≤800px ẩn hẳn thanh bên để bản đồ to hơn

## v8.5 (rà soát tổng thể)
- Sim 9 bản đồ × 3 độ khó × 6 chiến thuật: 0 lỗi. Dễ 54/54 thắng; Thường 36/54; Khó 11/54
- Cân bằng: Ngã Ba Sông & Đầm Lầy hpMul 0.95 (Thường: 1/6 → 6/12 và 1/6 → 4/12)
- Sửa: nút "Đợt tiếp" có thể còn bị khoá ngay sau khi tắt hướng dẫn/tạm dừng tới khung hình kế → cập nhật HUD ngay khi bỏ tạm dừng
- Kiểm tra trình duyệt cả luồng: menu → chọn bản đồ → hướng dẫn → xây → 5 đợt → lưu → Tiếp tục → thua → màn kết thúc → ván lưu bị xoá

## v8.6
- Màn thua: mục 🔍 "Vì sao thất thủ?" – 3 loại quái làm mất nhiều máu nhất + tối đa 3 gợi ý theo nhóm (bay, tàng hình, giáp, nhanh, đông/tách, đào hầm, hồi máu, phù thủy, trùm, quái thường); bỏ gợi ý đã làm (vd. đã có Mắt Thần); thua ở đợt trùm luôn có mẹo trùm
- `lossAdvice()` thuần logic trong waves.js + kiểm thử (55 tổng)

## v8.7
- Trong ván: khi một nhóm quái (bay/tàng hình/giáp/…) lọt ≥3 con trong cùng đợt → thông báo gợi ý tức thời (mỗi nhóm 1 lần/ván, bỏ qua ở Thử Nghiệm; không nhắc Mắt Thần nếu đã có); kiểm thử mới (56 tổng)

## v8.9 — Đại lộ & thành bảo vệ Lumi (2026-11-05)
- Theo yêu cầu mới: đường rộng 79,2 px (trước 46 px), ba làn quái mặt đất; quái thường/chạy nhanh xuất hiện theo tổ ba, giữ nguyên tổng quái và thưởng. Mỗi cổng có bộ chia làn riêng; cua trộn pháp tuyến liên tục; hội tụ đúng điểm cuối.
- Thay lâu đài nhỏ bằng sân thành 3×3 ô, tường bao, bốn vọng gác, Lumi gốc từ EyeTank ở giữa. Cấm xây trong sân; ván lưu cũ có tháp trên ô mới bị cấm được hoàn tiền theo cơ chế sẵn có. Tường nứt/cháy khi máu thấp.
- Mỹ thuật vây hãm: palette thép/đồng cháy, nền giảm bão hoà, cây cháy trụi, hố cháy; quái mắt đỏ, gai và răng nanh thay mắt tròn. Lumi giữ nguyên hình dáng.
- Báo động dùng chung HUD/canvas: quái trong 4 ô cuối → cảnh báo; trùm áp sát hoặc thành còn ≤30% → nguy cấp. Quái thưởng không gây báo động. Có chế độ giảm chuyển động, không rung khi hệ điều hành yêu cầu.
- Đóng gói lại bản một file với Lumi nhúng; thêm Lumi vào cache offline. Sửa lỗi có sẵn trong build: chuỗi thay thế chứa `$'` làm hỏng bundle, chuyển sang hàm thay thế; kiểm tra cú pháp khi build.
- Kiểm chứng: 64/64 test; Chrome xây tháp/gọi đợt bằng thao tác thật, ba làn, nguy cấp, editor, mobile 390×844, mọi bản đồ + ít hiệu ứng/giảm chuyển động, bản HTML mở trực tiếp bằng file://; 0 lỗi console.
- Sim Thường: Đồng Cỏ 9/12 chiến thuật-ván thắng; Đầm Lầy 3/6 thắng, không lỗi mô phỏng. Không tuyên bố đã quét toàn bộ cân bằng.
- Perf Đầm Lầy: 40 tháp/~300 quái, logic x4 trung bình 2,80 ms, tối đa 10,04 ms/khung (chưa tính vẽ).
- Ảnh: `docs/siege-{menu,battle,danger,mobile,editor}.png`; kiểm tra lại bằng `node tools/browser-check.js` (dùng Chrome và playwright-core sẵn có của EyeTank, không thêm dependency).
- Hoàn tất phạm vi yêu cầu, không khởi động lại vòng phát triển liên tục; không dùng git.

## Việc tiếp theo (ưu tiên từ trên xuống)
- [ ] Chọn ngôn ngữ Tiếng Việt / English
- [x] Trình vẽ: cho phép nhiều cổng (v7.5)
- [x] Trình vẽ: xem trước nhanh độ khó (v7.6)
- [x] Trình vẽ: chọn chủ đề bản đồ (v7.7)
- [x] Màn kết thúc: nút "Sửa bản đồ này" (v7.8)
- [x] Đo hiệu năng tình huống nặng (v7.9 – đủ nhanh, không cần tối ưu)
- [x] Cẩm nang: mẹo vẽ bản đồ (v8.0)
- [x] Trình vẽ: nút 🎲 Gợi ý (v8.1)
- [x] Trình vẽ: phím tắt (v8.2)
- [x] Rà soát trình vẽ trên điện thoại (v8.3)
- [x] Trình vẽ: thanh bên riêng khi đang vẽ (v8.4)
- [x] Rà soát tổng thể (v8.5)
- [x] Màn thua: gợi ý vì sao thua (v8.6)
- [x] Trong ván: gợi ý tức thời khi quái lọt nhiều (v8.7)
- [ ] Thống kê trọn đời: loại quái lọt nhiều nhất mọi ván (hiện ở màn Thành tựu)
