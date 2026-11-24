import React from 'react';
import { gatewayUrl } from '../../../../services/api';

export default function ContainerWirelessGuide() {
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(new URL(gatewayUrl('/')).hostname);
  return <details className="container-wireless-guide">
    <summary>Kết nối không dây với định tuyến: cần những gì?</summary>
    <p>Thiết bị lấy tọa độ GNSS/GPS, gửi qua mạng về hệ thống; hệ thống gắn GPS vào chuyến và tuyến đang chạy.
      Việc khai báo IMEI chưa chứng minh thiết bị đã kết nối.</p>
    <p><strong>Phương án tham chiếu cho đội xe:</strong> Teltonika FMC234 + SIM 4G → Traccar → bộ chuyển JSON → CCADRO → chuyến / tuyến.
      FMC234 dùng nguồn xe 10–30 V và có pin dự phòng; không phải thiết bị theo container độc lập lâu dài.
      Chưa triển khai Traccar và bộ chuyển này trong hệ thống hiện tại.</p>
    <div className="wireless-options">
      <article><h4>GPS có SIM / mạng di động</h4><p>Cần nguồn điện, SIM dữ liệu, APN và địa chỉ máy chủ.
        Ví dụ FMC920 dùng LTE Cat 1; giao thức TCP/UDP của hãng cần bộ nhận và chuyển đổi trước khi đưa vào cổng JSON hiện có.</p></article>
      <article><h4>Cảm biến Bluetooth qua gateway</h4><p>Cảm biến truyền cự ly gần tới bộ thu trên xe. Bộ thu có kết nối mạng để chuyển dữ liệu lên máy chủ.
        Bluetooth của cảm biến không tự truyền tới máy chủ từ xa.</p></article>
      <article><h4>Thiết bị qua nền tảng nhà cung cấp</h4><p>Có thể tích hợp API của nhà cung cấp, chẳng hạn Nexxiot.
        Cần tài khoản, quyền API và bộ chuyển dữ liệu sang định dạng của hệ thống này.</p></article>
    </div>
    <p>Nếu container rời đầu kéo, GPS trên xe không còn chứng minh vị trí container.
      Khi cần theo container tại bãi hoặc qua nhiều phương tiện, dùng thiết bị độc lập gắn container, ví dụ Nexxiot Globehopper / Edge, cùng API dịch vụ tương ứng.
      Chu kỳ báo cáo và khả năng truyền cảm biến phải được đối chiếu đúng model và gói dịch vụ.</p>
    <ol>
      <li>Xác định hãng, model, firmware, mạng truyền và giao thức thiết bị thực tế.</li>
      <li>Chuẩn bị địa chỉ HTTPS truy cập được từ mạng thiết bị và cấu hình bộ chuyển đổi nếu cần.</li>
      <li>Liên kết IMEI / serial, cấp khóa tại đây và cấu hình bên thiết bị hoặc bên tích hợp.</li>
      <li>Kiểm tra gói tin nhận thật, thời điểm GPS, chuyến và tuyến khớp trước khi vận hành.</li>
    </ol>
    <p className="container-notice">{local
      ? 'Hệ thống đang dùng địa chỉ localhost. Thiết bị ngoài máy này chưa thể gửi tới địa chỉ đó; cần máy chủ hoặc địa chỉ mạng truy cập được.'
      : 'Cần thử truy cập địa chỉ máy chủ từ mạng di động của thiết bị; địa chỉ hiển thị chưa chứng minh kết nối thực tế.'}</p>
    <p>Cổng hiện có nhận HTTP JSON và khóa X-Device-Key; chưa có bộ thu Bluetooth hay bộ giải mã TCP/UDP của hãng.
      Gói GPS quá 10 phút hiện bị từ chối, nên dữ liệu gửi bù sau mất sóng cần luồng nhập lịch sử riêng.
      Ngưỡng tín hiệu 2 phút / 10 phút cần điều chỉnh theo chu kỳ báo cáo và chế độ tiết kiệm pin thực tế.</p>
    <p className="container-field-hint">Tài liệu hãng: <a href="https://wiki.teltonika-gps.com/view/FMC920_GPRS_settings" target="_blank" rel="noreferrer">Teltonika · cấu hình mạng</a>
      {' · '}<a href="https://wiki.teltonika-gps.com/view/Teltonika_Data_Sending_Protocols" target="_blank" rel="noreferrer">Giao thức thiết bị</a>
      {' · '}<a href="https://nexxiot.com/edge/" target="_blank" rel="noreferrer">Nexxiot · API</a></p>
    <p className="container-field-hint"><a href="https://wiki.teltonika-gps.com/view/FMC234_General_description" target="_blank" rel="noreferrer">FMC234 · nguồn và kết nối</a>
      {' · '}<a href="https://www.traccar.org/devices/" target="_blank" rel="noreferrer">Traccar · thiết bị hỗ trợ</a>
      {' · '}<a href="https://www.traccar.org/forward/" target="_blank" rel="noreferrer">Traccar · chuyển dữ liệu</a></p>
  </details>;
}
