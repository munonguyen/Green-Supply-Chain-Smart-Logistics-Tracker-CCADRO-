# Mô hình vận hành hợp đồng–thanh toán logistics tại Việt Nam

Tài liệu này là thiết kế nghiệp vụ và kiểm soát hệ thống cho CCADRO trong bối cảnh
logistics B2B tại Việt Nam, cập nhật theo văn bản được tra cứu ngày 16/11/2026.
Đây không phải ý kiến tư vấn pháp lý cho một hợp đồng cụ thể. Trước khi vận hành
thương mại, doanh nghiệp cần luật sư và kế toán trưởng duyệt mẫu hợp đồng, biểu giá,
thuế, điều kiện vận tải và quy trình khiếu nại.

## 1. Kết luận chọn mô hình

Có hai mô hình cần tách biệt ngay trên pháp nhân, hợp đồng, hóa đơn và sổ tiền.

| Mô hình | CCADRO ký với khách | Ai chịu trách nhiệm dịch vụ | Ai xuất hóa đơn cho cước | Cách thu tiền |
| --- | --- | --- | --- | --- |
| **Logistics principal / 3PL** | CCADRO ký MSA và lệnh vận chuyển với khách; có thể thuê nhà vận tải phụ | CCADRO chịu trách nhiệm theo phạm vi dịch vụ đã nhận; hợp đồng phụ phân bổ lại rủi ro | CCADRO xuất hóa đơn cho khách; nhà vận tải xuất hóa đơn cho CCADRO | Tiền vào tài khoản CCADRO, đối soát công nợ với khách và nhà phụ |
| **Nền tảng marketplace** | Khách ký hợp đồng dịch vụ với nhà vận tải; CCADRO chỉ cung cấp nền tảng/điều phối | Nhà vận tải chịu trách nhiệm cước, hàng hóa, giao nhận; CCADRO chịu trách nhiệm nền tảng theo điều khoản công bố | Nhà vận tải xuất hóa đơn cước; CCADRO xuất hóa đơn phí nền tảng | Không tự giữ tiền cước của bên khác nếu chưa có cấu trúc ủy quyền/thu hộ và giấy phép phù hợp |

Khuyến nghị cho code và MVP hiện tại: chọn **mô hình 3PL principal**. Code đang có
`B2bContract.providerName` mặc định là CCADRO, `PaymentService` tính cước/thuế,
`ContractService.settleContractWithEpod` chốt giá trị với khách, phù hợp vai trò
CCADRO là bên bán dịch vụ. Việc CCADRO thuê xe/đơn vị vận tải chỉ là hợp đồng nhà
cung cấp riêng, không làm mất trách nhiệm đã cam kết với khách.

Nếu sau này chọn marketplace, cần tách sản phẩm và dữ liệu thành `platform_fee` và
`carrier_freight`, hiển thị rõ bên cung cấp dịch vụ, ký điều khoản ba bên/ủy quyền,
luồng payout và hóa đơn của từng bên. Không được dùng cùng một `payment_transactions`
để vừa thể hiện doanh thu cước của CCADRO vừa thể hiện tiền thu hộ nhà vận tải.
Nghị định 52/2024 định nghĩa dịch vụ hỗ trợ thu hộ/chi hộ và cổng thanh toán điện tử;
hoạt động cung ứng dịch vụ trung gian thanh toán phải nằm trong phạm vi giấy phép của
tổ chức được Ngân hàng Nhà nước cấp. [Nghị định 52/2024/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=210262)

## 2. Cơ sở pháp lý cần thiết kế vào nghiệp vụ

- Luật Thương mại định nghĩa logistics là tổ chức nhận hàng, vận chuyển, lưu kho,
  thủ tục và giao hàng theo thỏa thuận; thương nhân phải tuân thủ pháp luật và tập
  quán vận tải. Khách hàng phải cung cấp chỉ dẫn, thông tin hàng chính xác và thanh
  toán đến hạn. [Luật Thương mại 113/VBHN-VPQH 2025](https://vanban.chinhphu.vn/?pageid=27160&docid=215232&classid=2629)
- Với logistics, khách có 14 ngày kể từ ngày giao hàng để thông báo khiếu nại và
  sau khi khiếu nại có 9 tháng để thông báo việc kiện tại trọng tài/tòa án; đây là
  các mốc miễn trách nhiệm cần hiển thị trong hồ sơ giao hàng. Luật cũng quy định
  phạt vi phạm thương mại tối đa 8% giá trị phần nghĩa vụ bị vi phạm, trừ trường
  hợp đặc biệt; bồi thường phải dựa trên tổn thất thực tế, trực tiếp và có quan hệ
  nhân quả. Các mốc này nằm ở Điều 237–240 và 300–306 của văn bản hợp nhất.
- Nghị định 163/2017 quy định giới hạn trách nhiệm logistics nếu các bên không thỏa
  thuận; khi khách không khai trước giá trị hàng, mặc định được nêu là tối đa 500
  triệu đồng cho mỗi yêu cầu bồi thường, còn khi đã khai giá trị và được xác nhận
  thì giới hạn không vượt giá trị hàng. [Nghị định 163/2017/NĐ-CP](https://vanban.chinhphu.vn/?docid=192501&pageid=27160)
- Nghị định 158/2024 điều chỉnh hoạt động vận tải đường bộ từ 01/01/2025. Lệnh vận
  chuyển, thông tin người thuê, hàng, xe, tài xế, điểm nhận/giao, thời gian, cước và
  chứng từ phải được quản lý phù hợp với loại vận tải; không coi GPS một mình là
  thay thế toàn bộ giấy tờ vận tải. [Nghị định 158/2024/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=212082)
- Luật Giao dịch điện tử cho phép thông điệp dữ liệu có giá trị như văn bản/bản gốc
  khi truy cập được, toàn vẹn và dùng được để tham chiếu; giá trị chứng cứ phụ thuộc
  độ tin cậy của cách tạo, gửi, nhận, lưu trữ và xác định người khởi tạo. Chỉ hash
  SHA-256 của ứng dụng không tự trở thành chữ ký số. Chữ ký số phải gắn với chủ thể,
  dữ liệu ký, kiểm soát khóa, phát hiện thay đổi và chứng thư. [Luật Giao dịch điện tử 20/2023/QH15](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/36-vbhn-vpqh.pdf),
  [Nghị định 23/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=212829)
- Từ 01/07/2026, Nghị định 254/2026 điều chỉnh hóa đơn điện tử và thay thế Nghị định
  123/2020, Nghị định 41/2022 và Nghị định 70/2025. Dịch vụ thông thường lập hóa đơn
  khi hoàn thành dịch vụ hoặc khi thu tiền trước/trong khi cung cấp, trừ tiền đặt cọc
  đúng nghĩa để bảo đảm hợp đồng. Dịch vụ logistics số lượng lớn, phát sinh thường
  xuyên cần đối soát được lập hóa đơn khi hoàn thành đối soát, chậm nhất ngày 07 của
  tháng sau tháng phát sinh hoặc 07 ngày sau kỳ quy ước đã thỏa thuận. [Nghị định 254/2026/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=218689)
- Luật Bảo vệ dữ liệu cá nhân 91/2025 và Nghị định 356/2025 có hiệu lực từ 01/01/2026.
  Email, tên người nhận, số điện thoại, tài xế, biển số, ảnh ePOD và dữ liệu vị trí
  phải có mục đích, thông báo, quyền truy cập, thời hạn lưu giữ, phân quyền và kiểm
  soát chuyển dữ liệu xuyên biên giới. [Luật 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3),
  [Nghị định 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387)
- Luật Thương mại điện tử 122/2025 và Nghị định 248/2026 có hiệu lực từ 01/07/2026.
  Nếu CCADRO trở thành nền tảng cho bên khác đăng ký và giao kết, phải xác định đúng
  loại nền tảng, người bán/cung cấp dịch vụ, quy chế hoạt động, thông tin công khai,
  xử lý khiếu nại và trách nhiệm nền tảng. [Luật 122/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=216503&classid=1&typegroupid=3),
  [Nghị định 248/2026/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=218747)
- Chính sách VAT 8% chỉ áp dụng cho nhóm dịch vụ đủ điều kiện và trong thời hạn của
  Nghị định 174/2025; không được hard-code 8% vĩnh viễn trong payment service.
  [Nghị định 174/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=214310)

## 3. Quy trình vận hành chuẩn nên dùng

Mỗi bước phải có chủ thể, thời gian UTC, phiên bản tài liệu, dữ liệu đầu vào, hành
động và chứng cứ. Không cho phép một người vừa sửa giá, tự duyệt, xác nhận đã trả
tiền và chốt nghiệm thu.

### A. Trước khi nhận đơn

1. Onboard pháp nhân khách: tên đăng ký, mã số thuế, địa chỉ, người đại diện/chức
   danh, email tên miền, người được ủy quyền, hạn mức tín dụng, điều khoản dữ liệu.
2. Onboard nhà vận tải phụ: giấy đăng ký/điều kiện vận tải, bảo hiểm, phương tiện,
   tài xế, phạm vi tuyến, tài khoản nhận tiền, người có quyền ký.
3. Tạo MSA phiên bản 1: phạm vi dịch vụ, Incoterms nếu có, loại hàng/giá trị hàng,
   trách nhiệm và giới hạn, bảo hiểm, SLA, phụ phí, thuế, thời điểm hóa đơn, payment
   terms, lãi chậm trả, phạt/bồi thường, khiếu nại 14 ngày/9 tháng, luật áp dụng,
   trọng tài/tòa án, dữ liệu cá nhân, thuê nhà phụ, bất khả kháng, lưu trữ.
4. Không cho `autoSign` tạo trạng thái `SIGNED_ACTIVE`. Phải có luồng mời ký,
   xác thực người ký, xác nhận quyền đại diện và lưu bản điều khoản đã khóa.

### B. Một lệnh vận chuyển

1. Tạo báo giá có `quote_version`, thời hạn hiệu lực, căn cứ giá, VAT, phụ phí,
   tiền cọc/tạm ứng, cước dự kiến và bên chịu phí.
2. Khách chấp thuận đúng bản báo giá; hệ thống tạo `transport_order` bất biến từ
   MSA + quote. Thay đổi tuyến, hàng, giá hoặc thời gian tạo amendment, không sửa đè.
3. Xác nhận hàng: loại hàng, số kiện/trọng lượng, giá trị khai báo, hàng nguy hiểm,
   nhiệt độ, seal/container, hướng dẫn nhận/giao. Nếu chưa khai giá trị, ghi rõ hậu
   quả giới hạn trách nhiệm và yêu cầu khách xác nhận.
4. Gán nhà vận tải/xe/tài xế có quyền; phát hành lệnh vận tải và mã đối soát.

### C. Thực hiện và giao nhận

1. GPS là dữ liệu vận hành; phải lưu event có nguồn thiết bị, thời gian nhận, độ
   chính xác, người/thiết bị, sửa đổi và lý do. Không cho người vận hành sửa raw GPS.
2. Điểm nhận và điểm giao lập ePOD: người giao, người nhận, thời gian, vị trí,
   chữ ký/OTP hoặc chữ ký điện tử, ảnh, seal, tình trạng hàng, thiếu/hỏng và ghi chú.
   Trường hợp offline phải hash bản payload ở thiết bị, đồng bộ và ghi lịch sử xung đột.
3. Sự cố tạo claim/incident riêng. Dispatcher không tự chuyển thành “đạt SLA”; mọi
   miễn trách nhiệm, phạt, bồi thường hoặc giảm cước cần căn cứ điều khoản và người
   duyệt.

### D. Đối soát, hóa đơn, thanh toán

1. Sau ePOD, hệ thống lập `settlement_statement` theo từng dòng: cước, phụ phí,
   giảm trừ, phạt, VAT, số đã cọc và số còn phải trả. Hai bên xác nhận statement;
   không sửa payment amount trực tiếp.
2. Invoice engine chọn thời điểm theo loại dịch vụ và kỳ đối soát đã thỏa thuận,
   theo Nghị định 254/2026. `invoice_number` trong hệ thống hiện tại chỉ là mã nội
   bộ; phải bổ sung số/ký hiệu hóa đơn điện tử, mã cơ quan thuế hoặc dữ liệu nhà cung
   cấp hóa đơn, thời điểm lập và trạng thái phát hành.
3. Payment intent giữ tiền ở `PENDING`; chỉ webhook đã xác thực merchant, giao dịch,
   số tiền, tiền tệ, chữ ký và chống replay mới chuyển `PAID`. Không cho khách hàng
   tự gọi endpoint confirm; manual reconciliation phải là quyền kế toán/admin và có
   chứng từ ngân hàng đối chiếu.
4. Refund/reversal tạo một giao dịch bù trừ có lý do, người duyệt, chứng từ provider,
   số tiền và tham chiếu payment gốc. Không đổi `PAID` thành `REFUNDED` trực tiếp
   mà không có refund record.
5. Email là thông báo và bản sao hồ sơ. Hóa đơn điện tử hợp pháp phải đi qua hệ
   thống phát hành/nhà cung cấp hóa đơn và lưu XML/PDF/tra cứu; ZIP hiện tại không
   được gọi là “hóa đơn VAT”.

### E. Khiếu nại và lưu trữ

1. Nhận claim có mã, thời điểm, người gửi, shipment/order, loại tổn thất, giá trị,
   chứng cứ, thời hạn phản hồi. Tự nhắc mốc 14 ngày kể từ giao hàng và mốc 9 tháng
   khi đã có khiếu nại.
2. Tách `claim`, `credit_note`, `refund`, `penalty` và `compensation`; không dùng
   một trường `slaPenaltyDeductionVnd` để đại diện cho tất cả chế tài.
3. Lưu bản gốc và hash: MSA/quote/amendment, bằng chứng ký, lệnh vận chuyển, GPS raw,
   ePOD, incident, statement, invoice XML, provider payment event, email headers và
   audit. Hóa đơn/chứng từ phải an toàn, bảo mật, toàn vẹn, đầy đủ, truy cập/in được
   theo Nghị định 254/2026 và thời hạn kế toán; backup phải độc lập DB chính.

## 4. Đánh giá code hiện tại

### Đã đi đúng hướng

- Payment hiện đã chặn instant confirm mặc định, xác thực HMAC webhook, chống callback
  lặp và ghi `confirmationSource`.
- V027 lưu snapshot/hash, inbox email idempotent, append-only attempt và trigger cấm
  sửa nội dung. Đây là nền tốt cho chứng cứ thông điệp dữ liệu.
- Gateway loại header danh tính do client giả mạo; email lấy từ identity. Frontend
  production không tự ghi PAID khi API lỗi.
- Contract đã có MSA/spot, SLA event, ePOD settlement, credit limit và audit log.

### Khoảng cách pháp lý/nghiệp vụ nghiêm trọng

1. `ContractService` cho phép `autoSign=true` và `signContract` nhận username do
   request gửi lên. `sha256Signature(contractNumber|signer|timestamp)` không phải
   chữ ký điện tử vì không có payload khóa, chứng thư, bằng chứng kiểm soát khóa hay
   xác thực thẩm quyền đại diện. Phải đổi thành `SIGNING_PENDING` và tích hợp nhà
   cung cấp chữ ký số/e-signature; lưu signed document, certificate chain, timestamp,
   consent/audit và webhook kết quả.
2. `PaymentController` tạo payment từ `baseFreightVnd`, `customerId`, VAT và discount
   do client gửi. Đây là rủi ro sửa giá/thuế. Server phải nhận `quoteId`/`transportOrderId`
   và tính lại từ bảng giá phiên bản đã duyệt.
3. `invoiceNumber` hiện sinh cùng payment trước khi hoàn thành dịch vụ. Cần đổi tên
   thành `paymentReference` hoặc tách invoice lifecycle; chỉ phát hành hóa đơn khi
   đúng trigger đối soát/thu tiền theo loại dịch vụ và Nghị định 254.
4. `refundPayment` đổi trạng thái trực tiếp, không có refund request/approval/provider
   reference. Cần ledger bù trừ và quyền tách biệt.
5. SLA event nhận `penaltyAmountVnd` từ request và `settleContractWithEpod` trừ thẳng
   vào `baseFreight`. Cần policy version, evidence, người duyệt, trần phạt 8% (nếu
   áp dụng Luật Thương mại), credit note/statement riêng và không sửa số tiền đã thu.
6. `getContracts`, `getPayments`, soft-delete/restore và nhiều contract endpoint chưa
   thể hiện đầy đủ tenant/customer/hub authorization. Người dùng không được tự đọc
   hoặc sửa hợp đồng của khách khác chỉ vì biết contract number.
7. Gateway vẫn để các service có cổng riêng; nếu triển khai công khai, client có thể
   bỏ qua gateway. Chỉ cho mạng nội bộ/service identity gọi trực tiếp.
8. Cấu hình VAT 8% và merchant bank mặc định còn hard-code/fallback. Thuế suất,
   hóa đơn, tài khoản nhận tiền và nhà cung cấp phải là cấu hình đã duyệt theo pháp
   nhân, thời kỳ hiệu lực và quốc gia.
9. Hồ sơ email lưu email/tên/địa chỉ nhưng chưa có consent/purpose/retention/deletion
   policy theo Luật Bảo vệ dữ liệu cá nhân; Brevo là bên xử lý/chuyển dữ liệu cần được
   đánh giá và ràng buộc hợp đồng.

## 5. Kiến trúc dữ liệu cần bổ sung

Tạo migration theo từng nhóm, không sửa dữ liệu cũ:

```text
legal_party, party_representative, party_authorization
contract_document, contract_version, contract_signing_session, contract_signature
quote, quote_line, quote_approval, transport_order, transport_order_amendment
carrier_agreement, carrier_assignment, transport_document
pod_record, pod_attachment, telemetry_event_immutable, incident, claim
settlement_statement, settlement_line, tax_invoice, tax_invoice_event
payment_intent, payment_provider_event, payment_ledger_entry, refund_request
credit_note, compensation_case, dispute_case, retention_policy
consent_record, data_access_log, cross_border_transfer_record
```

Các bảng trạng thái dùng transition hợp lệ và optimistic lock. Tiền dùng `NUMERIC`
hoặc minor unit cùng currency; không dùng số tiền client gửi lại ở bước confirm.
Mỗi aggregate có `version`, `effective_from/to`, `created_by`, `approved_by`,
`source_event_id`, `content_hash` và `previous_hash` cho audit chain. Hash chain không
thay chữ ký số/WORM; cần backup immutable và phân quyền DBA.

## 6. Lộ trình triển khai đề xuất

**P0 – trước pilot thương mại:** tắt `autoSign`; tắt manual confirm cho customer;
server tính giá theo quote; tách payment reference khỏi invoice; thêm tenant
authorization; tạo refund record; khóa trực tiếp các port service; cấu hình webhook
provider thật; công bố điều khoản giới hạn trách nhiệm, bảo hiểm, khiếu nại.

**P1 – trước giao dịch có giá trị:** tích hợp ký điện tử có chứng thư hoặc e-signature
được doanh nghiệp phê duyệt; thêm contract version/amendment; ePOD có signer/OTP,
ảnh và vị trí; settlement statement; invoice connector; claim/dispute workflow;
data privacy consent and retention.

**P2 – production:** double-entry payment ledger; provider reconciliation; payout
nhà vận tải; credit note/refund; backup/WORM; monitoring queue; quarterly access review;
DR drill; kiểm thử độc lập với kế toán, vận hành và pháp chế.

## 7. Bộ hồ sơ phải xuất khi có tranh chấp

Một mã `case_id` phải tải được ZIP có manifest và hash của: hợp đồng/version đã ký,
chứng thư/chữ ký và timestamp, quote/amendment, lệnh vận chuyển, thông tin khai giá
trị hàng, assignment nhà vận tải, GPS raw và nguồn thiết bị, ePOD/ảnh/signature,
incident/claim, settlement statement, hóa đơn XML và tra cứu, payment provider event,
refund/credit note, email gốc/header và audit log. Người kiểm tra phải biết ai tạo,
ai duyệt, thời điểm nào, dữ liệu có sửa không và nguồn nào độc lập xác nhận.

## Nguồn pháp lý chính thức

[Luật Thương mại 113/VBHN-VPQH 2025](https://vanban.chinhphu.vn/?pageid=27160&docid=215232&classid=2629) ·
[Nghị định 163/2017/NĐ-CP](https://vanban.chinhphu.vn/?docid=192501&pageid=27160) ·
[Nghị định 158/2024/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=212082) ·
[Luật Giao dịch điện tử 20/2023/QH15](https://datafiles.chinhphu.vn/cpp/files/vbpq/2026/3/36-vbhn-vpqh.pdf) ·
[Nghị định 23/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=212829) ·
[Nghị định 254/2026/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=218689) ·
[Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=214590&classid=1&typegroupid=3) ·
[Nghị định 356/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=216387) ·
[Nghị định 52/2024/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=210262) ·
[Luật Thương mại điện tử 122/2025/QH15](https://chinhphu.vn/?pageid=27160&docid=216503&classid=1&typegroupid=3) ·
[Nghị định 248/2026/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=218747) ·
[Nghị định 174/2025/NĐ-CP](https://vanban.chinhphu.vn/?pageid=27160&docid=214310).
