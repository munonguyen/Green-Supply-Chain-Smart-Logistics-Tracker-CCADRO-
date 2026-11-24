import React from 'react';

export default function RouteEvidence({ candidate }) {
  let data = {};
  try { data = JSON.parse(candidate?.routingMetadataJson || '{}'); } catch { data = {}; }
  const tags = [
    data.shortestCandidate && 'Ngắn nhất trong tập phương án',
    data.fastestCandidate && 'Thời gian thấp nhất trong tập phương án',
    data.lowestEstimatedCarbonCandidate && 'CO₂ ước tính thấp nhất',
    data.paretoOptimal && 'Không bị phương án khác vượt đồng thời cả 3 tiêu chí'
  ].filter(Boolean);
  const summary = data.summary || {};
  const guidance = data.guidance?.instructions || [];
  const sections = (Array.isArray(data.trafficSections) ? data.trafficSections : []).filter((section) => section.sectionType === 'TRAFFIC');
  return <section className="route-evidence" aria-label="Cơ sở tính phương án">
    {tags.length > 0 && <ul>{tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
    <p>{data.trafficSource === 'TOMTOM_AVAILABLE_LIVE_AND_HISTORICAL'
      ? 'TomTom: đã yêu cầu giao thông hiện tại/lịch sử theo giờ khởi hành; mức chi tiết phụ thuộc vùng phủ.'
      : data.trafficSource === 'SIMULATED' ? 'Giao thông mô phỏng; không dùng để kết luận tắc đường thực tế.'
        : 'Chưa có nguồn giao thông thực tế cho phương án này.'}</p>
    {data.departAt && <p>Khởi hành dùng để tính: {new Date(data.departAt).toLocaleString('vi-VN')}</p>}
    {summary.trafficDelayInSeconds != null && <p>Chậm do giao thông theo nhà cung cấp: {Math.round(summary.trafficDelayInSeconds / 60)} phút.</p>}
    {summary.arrivalTime && <p>Dự kiến đến: {new Date(summary.arrivalTime).toLocaleString('vi-VN')}</p>}
    {summary.noTrafficTravelTimeInSeconds != null && <p>Thời gian khi thông thoáng: {Math.round(summary.noTrafficTravelTimeInSeconds / 60)} phút.</p>}
    {summary.historicTrafficTravelTimeInSeconds != null && <p>Thời gian theo giao thông lịch sử: {Math.round(summary.historicTrafficTravelTimeInSeconds / 60)} phút.</p>}
    {data.fetchedAt && <p>Dữ liệu tuyến cập nhật: {new Date(data.fetchedAt).toLocaleString('vi-VN')}; cần tính lại trước khi khởi hành nếu giao thông thay đổi.</p>}
    <p>{data.carbonModel === 'PROVIDER_FUEL_ESTIMATE'
      ? `CO₂ ước tính từ nhiên liệu dự báo theo hồ sơ tiêu hao xe và giao thông × hệ số ${data.carbonFactorKgPerLiter} kg CO₂/lít; chưa phải phát thải đo thực tế.`
      : 'CO₂ ước tính theo quãng đường × tải hàng × hệ số; chưa đo tiêu hao xe, chạy rỗng, máy lạnh và dừng/chờ thực tế.'}</p>
    <p>{data.truckProfileApplied
      ? 'Đã gửi kích thước và tổng trọng lượng cấu hình tới nhà cung cấp; cần đối chiếu đúng xe và biển báo tại thời điểm đi.'
      : 'Chưa kiểm chứng hạn chế tải trọng, chiều cao và giờ cấm xe container.'}</p>
    {sections.length > 0 && <details><summary>{sections.length} đoạn có thông tin giao thông</summary><ul>
      {sections.map((section, index) => <li key={index}>
        {section.simpleCategory || 'Đoạn giao thông'}
        {section.delayInSeconds != null && ' · chậm ' + Math.round(section.delayInSeconds / 60) + ' phút'}
        {section.startTime && ' · từ ' + new Date(section.startTime).toLocaleString('vi-VN')}
        {section.endTime && ' · đến ' + new Date(section.endTime).toLocaleString('vi-VN')}
      </li>)}</ul></details>}
    {guidance.length > 0 && <details><summary>Chỉ dẫn theo tuyến · {guidance.length} bước</summary><ol>
      {guidance.map((instruction, index) => <li key={index}>{instruction.message || instruction.maneuver}
        {instruction.routeOffsetInMeters != null && ' · mốc ' + (instruction.routeOffsetInMeters / 1000).toFixed(1) + ' km'}</li>)}
    </ol></details>}
  </section>;
}
