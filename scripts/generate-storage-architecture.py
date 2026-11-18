#!/usr/bin/env python3
"""Draw the proposed per-service storage architecture; no backend mutation."""
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('architecture', Path(__file__).with_name('generate-architecture.py'))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
Plate, COLORS = mod.Plate, mod.COLORS
INK, MUTED, BLUE, GREEN, PURPLE, ORANGE, RED = mod.INK, mod.MUTED, mod.BLUE, mod.GREEN, mod.PURPLE, mod.ORANGE, mod.RED

STORES = [
 dict(name='IDENTITY',port='8080',icon='key',schema='identity',spatial=False,
      data=['User • Role • Permission','Company • Hub IAM','Auth audit • Revoked token'],
      layout=['UNIQUE username / email','B-tree user / company ID','FK trong domain Identity'],
      extra=['Redis: denylist cache (*)','PostgreSQL giữ thu hồi thật','(*) tùy tải; TTL theo token'],
      why=['RBAC có nhiều quan hệ.','Cần ràng buộc duy nhất,','giao dịch và audit bền.']),
 dict(name='ASSET',port='8081',icon='truck',schema='asset',spatial=False,
      data=['Vehicle • Driver • Container','Inspection • Maintenance','Reservation • Shift'],
      layout=['UNIQUE mã xe / biển số','Lock / version khi reserve','Index status + capacity'],
      extra=['S3: hồ sơ / ảnh xe (*)','Redis: cache danh mục (*)','(*) bổ sung khi có nhu cầu'],
      why=['Trạng thái xe / tài xế','phải nhất quán khi giữ','tài nguyên và xuất bến.']),
 dict(name='SHIPMENT',port='8082',icon='box',schema='shipment',spatial=True,
      data=['Shipment • Dispatch','Saga state • Outbox','Origin / destination Point'],
      layout=['GiST geometry / geography','B-tree code / customer','Outbox cùng transaction'],
      extra=['Kafka: dispatch events','Outbox relay có ACK','Redis không là kho đơn'],
      why=['ACID cho đơn / Saga.','PostGIS cho điểm đi/đến','và truy vấn không gian.']),
 dict(name='ROUTING',port='8083',icon='route',schema='routing',spatial=True,
      data=['Route candidate / decision','RouteVersion • LineString','Score • Geometry snapshot'],
      layout=['GiST route geometry','UNIQUE version theo đơn','Index active route'],
      extra=['Redis: route cache (*)','Key gồm input + version','(*) TTL / invalidation rõ'],
      why=['Cần tuyến có phiên bản','và phép tính hình học.','Cache chỉ là bản sao.']),
 dict(name='TRACKING',port='8084',icon='pin',schema='tracking',spatial=True,
      data=['Trip • GPS telemetry','Deviation • Reroute','Route snapshot / read model'],
      layout=['Index (trip_id, timestamp)','GiST cho truy vấn vùng','Partition thời gian (*)'],
      extra=['Redis: latest GPS + TTL','Cooldown • SSE fan-out','S3: archive GPS (*)'],
      why=['Chuỗi thời gian + GIS.','PostGIS giữ lịch sử;','Redis phục vụ vị trí mới.']),
 dict(name='CARBON',port='8085',icon='leaf',schema='carbon',spatial=False,
      data=['Emission factor / version','Calculation • Benchmark','Fuel • ePOD metadata'],
      layout=['NUMERIC cho hệ số / CO₂e','Version bản tính / hệ số','Index trip / period'],
      extra=['S3: PDF / CSV báo cáo','S3: ảnh / chữ ký ePOD','DB: key + checksum'],
      why=['Dữ liệu số cần đối soát','và truy vết phiên bản.','File lớn để object store.']),
 dict(name='INCIDENT',port='8086',icon='alert',schema='incident',spatial=True,
      data=['Field incident • Point','Resolution • Demerit','Case audit • Outbox'],
      layout=['GiST incident_location','Index trip / status / time','Lịch sử giải trình rõ'],
      extra=['S3: ảnh / video sự cố','Kafka: emergency events','DB: evidence metadata'],
      why=['Sự cố gắn vị trí.','Điểm trừ / giải trình','cần giao dịch và audit.']),
 dict(name='NOTIFICATION',port='8087',icon='bell',schema='notification',spatial=False,
      data=['Notification • ACK / read','Event inbox • Dedup ID','Email job / attempt'],
      layout=['UNIQUE event_id bền vững','Index pending / next_retry','Lưu delivery status ở DB'],
      extra=['Redis Pub/Sub: SSE (*)','Kafka: nhận event','File: tham chiếu S3'],
      why=['Inbox / retry / ACK','phải còn sau restart.','Pub/Sub không lưu lịch sử.']),
 dict(name='PAYMENT',port='8088',icon='card',schema='payment',spatial=False,
      data=['Transaction • Contract','SLA • Webhook inbox','Evidence • Outbox / Audit'],
      layout=['NUMERIC cho tiền tệ','UNIQUE provider event ID','Snapshot + hash / version'],
      extra=['S3: hồ sơ / file evidence','DB: snapshot nhỏ + hash','Redis không là sổ cái'],
      why=['Thanh toán cần ACID,','idempotency, số chính xác','và đối soát bền vững.']),
 dict(name='HUB SHIPPER',port='8089',icon='hub',schema='hub_shipper',spatial=True,
      data=['Hub • Shipper • Manifest','Range / task assignment','Delivery Point • Zone (*)'],
      layout=['GiST + ST_DWithin (*)','Index hub / shipper / state','Manifest chỉ có 1 owner'],
      extra=['S3: ảnh Photo POD','Redis: vị trí tạm (*)','(*) GIS mới cần migration'],
      why=['Gần điểm giao / vùng','phục vụ dùng PostGIS.','Phân quyền theo Hub.']),
]

def draw():
 p=Plate(True)
 p.text(1600,65,'CCADRO  |  LỰA CHỌN LƯU TRỮ CHO TỪNG BACKEND SERVICE',43,INK,True,'middle')
 p.text(1600,109,'PostgreSQL cho nghiệp vụ • PostGIS cho không gian • Redis cho dữ liệu tạm • S3 cho file • Kafka cho event',25,MUTED,anchor='middle')
 p.pill(1310,133,580,'THIẾT KẾ ĐỀ XUẤT • KHÔNG PHẢI HIỆN TRẠNG',GREEN)
 p.rect(60,200,690,180,BLUE,'#f6fbff')
 p.icon(88,239,'web',BLUE,.9)
 p.text(166,245,'CLIENTS',28,BLUE,True)
 p.lines(166,289,['React Web Portal • Driver / Hub terminals','GPS Simulator • REST / SSE'],23,gap=35)
 p.line(750,290,850,290,INK,arrow=True)
 p.rect(860,200,1270,180,PURPLE,'#fbf8ff')
 p.icon(890,239,'shield',PURPLE,.9)
 p.text(1495,248,'API GATEWAY :8888',33,PURPLE,True,'middle')
 p.text(1495,292,'Spring Cloud Gateway • Routing • JWT / Identity • CORS',25,anchor='middle')
 p.text(1495,338,'Không cần database nghiệp vụ • Redis chỉ khi bổ sung rate limit',23,MUTED,anchor='middle')
 p.rect(2240,200,900,180,GREEN,'#f6fcf8')
 p.text(2270,245,'NGUYÊN TẮC CHỌN STORE',28,GREEN,True)
 p.lines(2270,291,['Mỗi service sở hữu dữ liệu và quyền DB của mình.','Cùng PostgreSQL engine vẫn là lựa chọn hợp lý.','Ký hiệu (*) = tùy chọn / nâng cấp cần triển khai thêm.'],23,gap=34)
 p.section(440,'01','DATABASE / SCHEMA PER SERVICE','Một owner • một role DB • transaction cục bộ trong domain')
 p.rect(60,461,3080,991,'#aab7c5','white',dash='9 7')
 p.line(1495,380,1495,465,PURPLE,arrow=False)
 p.line(223,465,2977,465,PURPLE,arrow=False,sw=1.5)
 for i,s in enumerate(STORES):
  x=80+i*306;cx=x+143;c=COLORS[i]
  p.line(cx,465,cx,485,PURPLE,arrow=True,sw=1.5)
  p.rect(x,487,286,944,c,c+'06')
  p.icon(cx-27,510,s['icon'],c,1)
  p.text(cx,606,s['name'],25,c,True,'middle')
  p.text(cx,643,':'+s['port']+'  •  Spring Boot',20,MUTED,anchor='middle')
  p.line(x+15,665,x+271,665,c,sw=1)
  p.text(x+18,700,'DỮ LIỆU NGHIỆP VỤ',20,c,True)
  p.lines(x+18,739,s['data'],20,gap=32)
  p.db(x+12,833,262,105,['PostgreSQL','+ PostGIS' if s['spatial'] else 'ACID / relational'],BLUE)
  p.text(cx,972,s['schema'],21,c,True,'middle')
  p.lines(x+18,1013,s['layout'],20,gap=32)
  p.line(x+15,1100,x+271,1100,c,sw=1)
  p.text(x+18,1133,'KHO PHỤ TRỢ / FILE',20,c,True)
  p.lines(x+18,1173,s['extra'],20,gap=32)
  p.rect(x+12,1282,262,132,c,'white',sw=1)
  p.text(x+25,1313,'VÌ SAO CHỌN?',18,c,True)
  p.lines(x+25,1346,s['why'],20,gap=27)
 p.section(1510,'02','CÁC LOẠI LƯU TRỮ BỔ TRỢ','Đường dữ liệu đề xuất; cần triển khai kết nối và chính sách tương ứng')
 # Shared technologies have isolated owners / namespaces, not shared business tables.
 p.rect(60,1533,980,272,RED,'#fff9f8')
 p.icon(85,1556,'stream',RED,.9)
 p.text(160,1583,'REDIS • CACHE / TTL / PUB-SUB',27,RED,True)
 p.lines(90,1633,['Tracking → latest position, cooldown; tái tạo từ DB.','Routing → cache route theo input/version nếu cần.','Identity → cache revoke token; DB vẫn là nguồn thật.','Notification → SSE fan-out; reconnect lấy snapshot.','Namespace/ACL riêng; Pub/Sub không bảo đảm replay.'],23,gap=34)
 p.rect(1080,1533,1000,272,BLUE,'#f6fbff')
 p.icon(1105,1555,'cloud',BLUE,.9)
 p.text(1185,1583,'AMAZON S3 • OBJECT STORAGE',27,BLUE,True)
 p.lines(1110,1633,['Hub / Carbon → ảnh POD, chữ ký, báo cáo PDF/CSV.','Incident → ảnh/video bằng chứng; Payment → hồ sơ.','Bucket/prefix + IAM theo owner; signed URL ngắn hạn.','DB lưu object key + version + checksum + trạng thái.','S3-compatible là phương án khác; kiểm tra tính năng.'],23,gap=34)
 p.rect(2120,1533,1020,272,PURPLE,'#fcf9ff')
 p.icon(2145,1555,'kafka',PURPLE,.9)
 p.text(2225,1583,'KAFKA • EVENT LOG / REPLAY',27,PURPLE,True)
 p.lines(2150,1633,['Shipment / Tracking / Incident / Carbon / Hub → event.','DB nghiệp vụ + outbox cùng transaction → Kafka.','Notification / read models nhận qua inbox chống lặp.','Retention của topic là giới hạn replay, không là backup.','Consumer chỉ truy cập store riêng của domain mình.'],23,gap=34)
 p.section(1865,'03','LỘ TRÌNH ÁP DỤNG','Tối ưu theo code và quy mô hiện tại • mở rộng khi có số liệu tải')
 p.rect(60,1886,1510,215,GREEN,'#f7fcf8')
 p.text(90,1928,'MVP: MỘT POSTGRESQL, TÁCH QUYỀN SỞ HỮU',27,GREEN,True)
 p.lines(90,1972,['10 schema/role riêng; migrate theo service; credentials riêng, không cấp quyền chéo.','Bỏ JOIN xuyên domain; chuyển hub/manifest về Hub Shipper; Asset giữ container gốc.','Tracking giữ route snapshot/read model; tham chiếu service khác qua ID/API/event.','S3 cho file; Redis cho Tracking trước; tránh đưa dữ liệu nghiệp vụ chỉ vào cache.'],23,gap=34)
 p.rect(1610,1886,1530,215,ORANGE,'#fffcf7')
 p.text(1640,1928,'KHI TẢI TĂNG: TÁCH THEO NHU CẦU THỰC',27,ORANGE,True)
 p.lines(1640,1972,['Tracking: partition telemetry theo thời gian; cân nhắc TimescaleDB sau benchmark.','Archive GPS cũ sang S3/Parquet nếu cần; xác minh trước khi xóa dữ liệu nóng.','OLAP / search engine riêng khi query đo được cần; PostgreSQL vẫn giữ bản gốc.','WAL/PITR + thử restore; S3 versioning/retention; Object Lock khi có yêu cầu.'],23,gap=34)
 p.rect(60,2140,3080,90,'#bdc8d4','#fbfcfe',r=10,sw=1)
 p.line(90,2172,155,2172,INK,arrow=True)
 p.text(175,2179,'REST/API',21)
 p.text(440,2179,'PostgreSQL = kho chính',21,BLUE,True)
 p.text(900,2179,'Redis = dữ liệu tạm',21,RED,True)
 p.text(1330,2179,'S3 = file',21,BLUE,True)
 p.text(1650,2179,'Kafka = event log',21,PURPLE,True)
 p.text(3100,2179,'PostGIS mới cho Hub Shipper • TimescaleDB là tùy chọn',21,MUTED,anchor='end')
 p.text(90,2212,'Căn cứ: entity / repository / Flyway hiện có • tham khảo PostgreSQL, PostGIS, Redis, Amazon S3 docs • chi tiết: docs/STORAGE_ARCHITECTURE_PROPOSAL.md',19,MUTED)
 p.text(3140,2260,'CCADRO  /  PROPOSED STORAGE ARCHITECTURE',18,MUTED,True,'end')
 p.write('ccadro-storage-per-service.svg')
 print(mod.OUT/'ccadro-storage-per-service.svg')

if __name__=='__main__':draw()
