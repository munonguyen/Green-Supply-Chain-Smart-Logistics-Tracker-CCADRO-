#!/usr/bin/env python3
"""Generate source-reviewed CCADRO architecture plates as editable SVG.

No network or credentials required. Rasterize with resvg, a browser, or Inkscape.
"""
from pathlib import Path
from html import escape

OUT = Path(__file__).resolve().parents[1] / 'docs/assets/architecture-generated'
W, H = 3200, 2280
INK, MUTED = '#172538', '#56677b'
BLUE, GREEN, PURPLE, ORANGE, RED = '#1772b4', '#238449', '#7850ad', '#bb7012', '#bc4247'
COLORS = [GREEN, BLUE, ORANGE, '#15919a', '#cf4c72', GREEN, '#c57421', '#b5830c', '#3674b8', PURPLE]
SERVICES = [
 ('IDENTITY', '8080', 'key', ['JWT • RBAC', 'User • Company', 'Hub IAM • Audit'], ['users / roles', 'companies / hub_iam']),
 ('ASSET', '8081', 'truck', ['Xe • Tài xế', 'Container • Pre-trip', 'Bàn giao • Hub assets'], ['vehicle / driver', 'container / inspection']),
 ('SHIPMENT', '8082', 'box', ['Đơn hàng • Dispatch', 'Saga điều phối', 'Outbox + Saga log'], ['shipment / dispatch', 'outbox / saga log']),
 ('ROUTING', '8083', 'route', ['Tuyến xanh đa tiêu chí', 'RouteVersion', 'OSRM / mock fallback'], ['route_candidate', 'route_version']),
 ('TRACKING', '8084', 'pin', ['GPS • Trip • Lệch tuyến', 'Đề xuất đổi tuyến', 'Fleet telemetry SSE'], ['trip / telemetry', 'alert / reroute']),
 ('CARBON', '8085', 'leaf', ['ePOD • Nhiên liệu', 'WTW • TTW • WTT', 'Benchmark • Báo cáo'], ['proof_of_delivery', 'emission / benchmark']),
 ('INCIDENT', '8086', 'alert', ['Sự cố hiện trường', 'Giải trình • Điểm trừ', 'Cảnh báo khẩn cấp'], ['field_incident', 'resolution / demerit']),
 ('NOTIFICATION', '8087', 'bell', ['Kafka consumer', 'Thông báo • SSE • ACK', 'Email inbox + worker'], ['emergency_notification', 'payment_email_inbox']),
 ('PAYMENT', '8088', 'card', ['Thanh toán • Hợp đồng', 'SLA • Evidence SHA-256', 'Relay hồ sơ qua REST'], ['payment / contract', 'evidence / audit']),
 ('HUB SHIPPER', '8089', 'hub', ['Phân quyền theo Hub', 'Manifest • Dải nhiệm vụ', 'Photo POD (URL)'], ['hub / shipper', 'manifest / assignment']),
]


class Plate:
 def __init__(self, target=False):
  self.target=target
  self.s=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">',
   '<title>CCADRO '+('Target architecture proposal' if target else 'Current architecture from source')+'</title>',
   '<defs>'+''.join(f'<marker id="a{c[1:]}" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L9 5 L0 10 Z" fill="{c}"/></marker>' for c in [INK,BLUE,GREEN,PURPLE,ORANGE,RED])+'</defs>',
   '<rect width="3200" height="2280" fill="white"/>']
 def rect(self,x,y,w,h,c=BLUE,fill='white',r=16,sw=2,dash=None):
  self.s.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}" stroke="{c}" stroke-width="{sw}"'+(f' stroke-dasharray="{dash}"' if dash else '')+'/>')
 def text(self,x,y,t,size=24,c=INK,bold=False,anchor='start'):
  self.s.append(f'<text x="{x}" y="{y}" font-family="Arial, sans-serif" font-size="{size}" fill="{c}" font-weight="{700 if bold else 400}" text-anchor="{anchor}">{escape(t)}</text>')
 def lines(self,x,y,arr,size=24,c=INK,gap=38,bold=False,anchor='start'):
  for i,t in enumerate(arr): self.text(x,y+i*gap,t,size,c,bold,anchor)
 def line(self,x1,y1,x2,y2,c=INK,dash=False,arrow=False,sw=2.5):
  self.path([(x1,y1),(x2,y2)],c,dash,arrow,sw)
 def path(self,pts,c=INK,dash=False,arrow=True,sw=2.5):
  d='M'+' L'.join(f'{x},{y}' for x,y in pts)
  self.s.append(f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{sw}" stroke-linejoin="round"'+(' stroke-dasharray="10 7"' if dash else '')+(f' marker-end="url(#a{c[1:]})"' if arrow else '')+'/>')
 def pill(self,x,y,w,t,c=BLUE):
  self.rect(x,y,w,36,c,c+'0c',r=10,sw=1)
  self.text(x+w/2,y+25,t,19,c,True,'middle')
 def icon(self,x,y,kind,c=BLUE,scale=1):
  shapes={
   'key':'<circle cx="17" cy="17" r="11"/><path d="M25 25L45 45M34 34L41 27M40 40L47 33"/>',
   'truck':'<rect x="3" y="12" width="29" height="25" rx="3"/><path d="M32 22h11l9 10v8H32M43 22v12h9"/><circle cx="14" cy="42" r="6"/><circle cx="42" cy="42" r="6"/>',
   'box':'<path d="M5 15L27 3l23 12v27L27 54 5 42ZM5 15l22 13 23-13M27 28v26M16 9l23 13"/>',
   'route':'<circle cx="7" cy="45" r="5"/><circle cx="46" cy="8" r="5"/><path d="M13 45h26c17 0 17-19 0-19H18C1 26 1 8 18 8h21"/>',
   'pin':'<path d="M27 53S8 33 8 22a19 19 0 0138 0C46 33 27 53 27 53Z"/><circle cx="27" cy="22" r="7"/>',
   'leaf':'<path d="M8 46C0 19 18 6 49 6c0 30-10 49-33 39M6 53L37 19M19 40V26M28 30h13"/>',
   'alert':'<path d="M27 4L53 49H2Z"/><path d="M27 18v16M27 40v2"/>',
   'bell':'<path d="M12 37V23c0-21 30-21 30 0v14l6 7H6ZM21 49c3 6 9 6 12 0M27 4V1"/>',
   'card':'<rect x="2" y="9" width="51" height="36" rx="5"/><path d="M2 20h51M10 34h13M35 34h9"/>',
   'hub':'<path d="M2 22L27 4l26 18M8 20v30h38V20M21 50V32h13v18M15 22h5M35 22h5"/>',
   'web':'<rect x="2" y="5" width="51" height="43" rx="4"/><path d="M2 16h51M9 10h3M17 10h3M25 10h3M15 29l-6 5 6 5M40 29l6 5-6 5M31 25l-7 18"/>',
   'stream':'<path d="M4 36q23-27 46 0M11 43q16-19 32 0M19 49q8-9 16 0M0 24q27-30 54 0"/>',
   'cloud':'<path d="M14 44C-3 44-1 23 13 23c-3-25 31-27 33-5 22-1 23 26 3 26Z"/>',
   'shield':'<path d="M27 3L49 11v17c0 14-22 25-22 25S5 42 5 28V11ZM16 28l8 8 15-18"/>',
   'kafka':'<circle cx="18" cy="28" r="7"/><circle cx="18" cy="7" r="5"/><circle cx="18" cy="49" r="5"/><circle cx="43" cy="15" r="5"/><circle cx="43" cy="41" r="5"/><path d="M18 12v9M18 35v9M24 24l15-7M24 32l15 7"/>',
  }
  self.s.append(f'<g transform="translate({x} {y}) scale({scale})" fill="none" stroke="{c}" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round">{shapes.get(kind,shapes["box"])}</g>')
 def db(self,x,y,w,h,label,c=BLUE):
  # Database icon plus text in a bounded card; renderer preserves editable labels.
  self.rect(x,y,w,h,c,'#ffffff',r=12,sw=1.6)
  self.s.append(f'<g transform="translate({x+14},{y+19})" fill="{c}22" stroke="{c}" stroke-width="2"><path d="M0 9v33c0 12 38 12 38 0V9"/><ellipse cx="19" cy="9" rx="19" ry="8"/><path d="M0 24c0 11 38 11 38 0M0 35c0 11 38 11 38 0"/></g>')
  if isinstance(label,str):label=[label]
  self.lines(x+66,y+34,label,20,c,28,True)
 def section(self,y,num,title,sub=''):
  self.pill(60,y-30,52,num,PURPLE)
  self.text(130,y-5,title,28,INK,True)
  if sub:self.text(3140,y-5,sub,21,MUTED,False,'end')
 def write(self,name):
  OUT.mkdir(parents=True,exist_ok=True)
  (OUT/name).write_text('\n'.join(self.s+['</svg>']),encoding='utf-8')


def top(p):
 t=p.target
 p.text(1600,64,'CCADRO  |  '+('KIẾN TRÚC ĐỀ XUẤT KHẮC PHỤC' if t else 'KIẾN TRÚC HỆ THỐNG HIỆN TẠI'),48,INK,True,'middle')
 p.text(1600,108,'Green Supply Chain & Smart Logistics Tracker  •  Java 17 / Spring Boot 3.3.4 + Spring Cloud Gateway',25,MUTED,False,'middle')
 p.pill(1340,130,520,'TO-BE • ĐỀ XUẤT, CHƯA TRIỂN KHAI' if t else 'AS-IS • ĐỌC TỪ SOURCE / CONFIG',GREEN if t else BLUE)
 # Clients.
 p.rect(60,195,710,255,BLUE,'#f6fbff')
 p.text(415,230,'CLIENTS',28,BLUE,True,'middle')
 p.icon(90,255,'web',BLUE)
 p.lines(163,273,['WEB PORTAL • React 18 + Vite :5173','Leaflet • Admin / Dispatcher / Customer', 'Driver / Hub Shipper là giao diện trên web'],22,gap=33)
 p.icon(92,374,'pin',GREEN,.8)
 p.lines(163,389,['GPS Simulator (Python) → telemetry API', 'Một React frontend phục vụ các vai trò'],21,gap=30)
 # Gateway.
 p.rect(860,195,1300,255,PURPLE,'#fbf8ff')
 p.icon(890,230,'shield',PURPLE,1.1)
 p.text(1510,242,'API GATEWAY :8888',35,PURPLE,True,'middle')
 p.text(1510,281,'Spring Cloud Gateway • JWT introspection → Identity :8080',24,INK,False,'middle')
 tags=['Routing','CORS','Swagger Hub'] + (['Rate limit','Timeout / CB'] if t else ['X-Auth-* headers'])
 widths=[180]*len(tags); sx=1510-(sum(widths)+16*(len(tags)-1))/2
 for label,ww in zip(tags,widths):p.pill(sx,306,ww,label,PURPLE);sx+=ww+16
 p.text(1510,389,'HTTPS / private ingress • JWT tại từng service • DNS nội bộ' if t else 'Route tĩnh localhost:8080–8089 • auth/introspect mỗi request được bảo vệ',23,INK,False,'middle')
 p.text(1510,424,'Bảo vệ API nội bộ bằng service identity, không tin header từ client' if t else 'Frontend → Gateway; SSE trả về từ Tracking và Notification',21,MUTED,False,'middle')
 p.line(770,306,850,306,INK,arrow=True)
 # Runtime / infrastructure.
 p.rect(2250,195,890,255,GREEN if t else BLUE,'#f7fcfa' if t else '#f8fbfe')
 p.icon(2280,226,'cloud',GREEN if t else BLUE,.9)
 p.text(2350,248,'TRIỂN KHAI / VẬN HÀNH',27,GREEN if t else BLUE,True)
 p.lines(2280,298,(['Container từng service • Compose + DNS cho MVP','Secrets ngoài source • health / metrics / traces','CI: test → build image → deploy có kiểm soát','HA / replicas khi có yêu cầu vận hành thực tế'] if t else ['dev-start.sh: 11 JVM riêng + Vite trên host','Compose: PostgreSQL/PostGIS + Redis + Kafka','GitHub Actions: backend test; frontend lint/test/build','Chưa có manifest Kubernetes / Helm trong repo']),23,gap=37)


def services(p):
 t=p.target
 p.section(515,'01','10 DOMAIN SERVICES', 'Database / schema riêng có owner + credentials riêng' if t else 'Tách tiến trình • cùng database / credentials mặc định')
 p.rect(60,537,3080,535,'#aab7c5','#ffffff',dash='9 7')
 # Bus is purely gateway routing; all cards receive solid arrows.
 p.line(1510,450,1510,540,PURPLE,arrow=False)
 p.line(223,540,2977,540,PURPLE,arrow=False)
 for i,(name,port,ic,desc,tables) in enumerate(SERVICES):
  x=80+i*306; c=COLORS[i];cx=x+143
  p.path([(cx,540),(cx,556)],PURPLE,sw=1.5)
  p.rect(x,558,286,488,c,c+'06')
  p.icon(cx-26,580,ic,c,.95)
  p.text(cx,677,name,25,c,True,'middle')
  p.text(cx,714,f':{port}  •  Spring Boot',21,MUTED,False,'middle')
  p.line(x+16,738,x+270,738,c,sw=1)
  p.lines(x+19,779,desc,21,gap=36)
  if t:
   dbname=['identity','asset','shipment','routing','tracking','carbon','incident','notification','payment','hub_shipper'][i]
   p.db(x+12,900,262,126,[dbname+'_db','PostGIS' if i in [2,3,4,6] else 'PostgreSQL'],c)
  else:
   p.rect(x+12,900,262,126,c,'white',sw=1)
   p.text(cx,929,'TABLES TRONG DB CHUNG',17,c,True,'middle')
   p.lines(cx,967,tables,19,MUTED,29,anchor='middle')
 if not t:
  for i in range(10):
   cx=223+i*306
   p.line(cx,1046,cx,1103,BLUE,arrow=False,sw=1.8)
  p.line(223,1103,2977,1103,BLUE,arrow=False)
  p.line(1040,1103,1040,1145,BLUE,arrow=True)


def data(p):
 t=p.target
 if t:
  p.rect(60,1145,1940,150,GREEN,'#f5fcf7')
  p.icon(86,1182,'shield',GREEN,.95)
  p.text(163,1190,'F1 → OWNER DỮ LIỆU RÕ RÀNG',27,GREEN,True)
  p.lines(163,1231,['MVP: schema riêng + DB role riêng trong một PostgreSQL; tách instance khi cần.',
   'Bỏ JOIN xuyên domain; Tracking giữ route snapshot / read model đồng bộ qua event.'],24,gap=35)
 else:
  p.rect(60,1145,1940,150,BLUE,'#f5faff')
  p.db(82,1170,630,99,['PostgreSQL 16 + PostGIS 3.4','Một database: ccadro'],BLUE)
  p.text(740,1187,'SHARED DATABASE • Flyway tập trung V001–V028',27,BLUE,True)
  p.lines(740,1226,['Tracking JOIN vehicle / driver / shipment / route_version.',
   'Asset và Hub Shipper cùng map một số bảng hub / manifest.'],23,gap=35)
 p.rect(2040,1145,1100,150,RED if not t else GREEN,'#fff9f8' if not t else '#f6fcf8')
 p.text(2070,1187,'REDIS 7 :6379  '+('→ ĐƯỜNG DỮ LIỆU CỤ THỂ' if t else '→ ĐÃ KHAI BÁO TRONG COMPOSE'),26,RED if not t else GREEN,True)
 p.lines(2070,1227,(['Tracking → latest position / TTL / cooldown.', 'SSE nhiều replica: fan-out qua Redis Pub/Sub; snapshot từ DB.'] if t else ['Có dependency Redis ở Tracking; chưa thấy lệnh đọc/ghi Redis.', 'Fleet SSE hiện giữ subscriber trong memory của từng JVM.']),23,gap=35)


def flows(p):
 t=p.target
 p.section(1350,'02','LUỒNG GIAO TIẾP & TÍCH HỢP','Chỉ vẽ đường kết nối được xác nhận trong source' if not t else 'Kế thừa domain hiện có • bổ sung độ bền và khả năng phục hồi')
 # Panel A: real synchronous saga.
 p.rect(60,1372,1000,370,ORANGE,'#fffcf7')
 p.text(90,1418,'ĐIỀU PHỐI ĐỒNG BỘ • REST / FEIGN',26,ORANGE,True)
 nodes=[(90,1480,215,'Shipment'),(370,1480,180,'Asset'),(615,1480,180,'Routing'),(860,1480,170,'Tracking')]
 for x,y,w,s in nodes:p.pill(x,y,w,s,ORANGE)
 p.path([(305,1498),(338,1498),(338,1468),(945,1468)],ORANGE,arrow=False)
 for cx in [460,705,945]:p.line(cx,1468,cx,1478,ORANGE,arrow=True,sw=1.5)
 p.text(90,1562,'Trình tự UC06: kiểm tra/khóa xe → xác minh tuyến → tạo Trip.',23)
 p.lines(90,1610,(['F3 → Bổ sung reservation nguyên tử + idempotency key.', 'Lưu từng bước Saga; worker tiếp tục sau crash.', 'Bù trừ retry đến khi xong; không đánh dấu xong nếu còn lỗi.'] if t else ['Có Saga log và bù trừ trạng thái xe / tài xế.', 'Tracking → Routing: duyệt đổi tuyến; Routing → Shipment.', 'Carbon/ePOD → Shipment, Asset, Tracking qua REST.']),23,gap=38)
 # Panel B: Kafka.
 p.rect(1100,1372,1040,370,PURPLE,'#fcf9ff')
 p.icon(1128,1390,'kafka',PURPLE,.8)
 p.text(1195,1418,'APACHE KAFKA :9092',28,PURPLE,True)
 p.text(1128,1460,'F2 → Outbox nguyên tử → relay có ACK → Kafka' if t else 'Tracking / Incident → ccadro.emergency.notifications',23)
 p.pill(1128,1491,260,'Outbox producers' if t else 'Tracking / Incident',PURPLE)
 p.pill(1475,1491,195,'Kafka',PURPLE)
 p.pill(1758,1491,350,'Notification / Carbon' if t else 'Notification consumer',PURPLE)
 p.line(1388,1509,1465,1509,PURPLE,True,True)
 p.line(1670,1509,1748,1509,PURPLE,True,True)
 p.lines(1128,1570,(['Event ID • consumer inbox / dedup bền vững.', 'Retry / backoff • DLQ + replay; commit sau xử lý.', 'GPS thô tách khỏi outbox nghiệp vụ; giới hạn theo tải.', 'Production cần HA: 3 broker, RF=3; MVP giữ 1 broker.'] if t else ['1 broker/controller • replication factor = 1.', 'Producer async + REST fallback; chưa có outbox cảnh báo.', 'Shipment outbox → Notification bằng REST (không Kafka).', 'Payment evidence → inbox Notification qua REST + retry.']),23,gap=39)
 # Panel C: external & front end.
 p.rect(2180,1372,960,370,BLUE,'#f7fbff')
 p.text(2210,1418,'EXTERNAL / CLIENT STATE',26,BLUE,True)
 if t:
  p.lines(2210,1464,['OSRM có timeout; ghi rõ chất lượng dữ liệu / mock.', 'VNPay webhook có chữ ký + idempotency / đối soát.', 'Brevo: giữ durable inbox + evidence SHA-256.', 'F4 → Object storage cho ảnh POD / chứng từ.', 'Hub Shipper / Carbon / Payment → signed upload.', 'F5 → Auth, chat, payment lấy backend làm nguồn thật.', 'Local storage chỉ cache; demo/offline có nhãn riêng.'],23,gap=39)
 else:
  p.lines(2210,1464,['Routing: OSRM adapter + mock fallback.', 'VNPay: URL ký nếu cấu hình; mặc định sandbox.', 'Brevo: email thật khi được cấu hình; có durable inbox.', 'Hub photo POD lưu proofImageUrl / caption vào DB.', 'Chưa có S3 / MinIO / file service được triển khai.', 'Auth/chat/payment có state / fallback localStorage.', 'Chat có BroadcastChannel đồng bộ giữa tab.'],23,gap=39)


def review(p):
 t=p.target
 p.section(1800,'03','ƯU TIÊN KHẮC PHỤC TỪ REVIEW' if t else 'NHẬN XÉT KIẾN TRÚC HIỆN TẠI','Các ô F1–F6 tương ứng trực tiếp giữa hai sơ đồ')
 items = ([
  ('F1','TÁCH QUYỀN SỞ HỮU DỮ LIỆU',['Schema/role riêng → loại JOIN xuyên domain.', 'Hub/manifest có một owner; service khác dùng API/event.']),
  ('F2','BẢO ĐẢM SỰ KIỆN',['Outbox cùng transaction nghiệp vụ; consumer inbox.', 'ACK, retry, DLQ/replay; không nuốt exception xử lý.']),
  ('F3','PHỤC HỒI SAGA',['Reserve tài nguyên nguyên tử, key chống lặp.', 'Step log, retry bù trừ, reconcile sau crash.']),
  ('F4','LƯU TRỮ POD TẬP TRUNG',['S3-compatible + signed URL + access control.', 'Metadata + checksum ở DB; retention / versioning.']),
  ('F5','NGUỒN DỮ LIỆU THỐNG NHẤT',['Backend quản lý auth, chat, payment nghiệp vụ.', 'Offline/demo tách riêng; không coi token giả là JWT.']),
  ('F6','BẢO MẬT & VẬN HÀNH',['DNS nội bộ, JWT/service identity, secret manager.', 'OTel / metrics / logs; giám sát Saga, lag và outbox.'])
 ] if t else [
  ('F1','DỮ LIỆU GẮN CHẶT',['Database/credentials chung; JOIN chéo domain.', 'Hub/manifest có entity ở cả Asset và Hub Shipper.']),
  ('F2','CẢNH BÁO CÓ KHOẢNG TRỐNG',['Tracking/Incident gửi async ngoài durable outbox.', 'Kafka listener catch/log lỗi; cần retry / DLQ rõ ràng.']),
  ('F3','SAGA CẦN PHỤC HỒI',['Có bù trừ nhưng lỗi bù trừ chỉ được log.', 'Khóa xe/tài xế qua nhiều request; chưa atomic reserve.']),
  ('F4','POD CHƯA CÓ OBJECT STORE',['Photo POD nhận URL; chưa có pipeline upload.', 'Cần owner, kiểm soát truy cập và lifecycle file.']),
  ('F5','STATE / AUTH PHÂN TÁN',['Frontend có offline auth + token giả và local ledger.', 'Chat localStorage/BroadcastChannel không liên thiết bị.']),
  ('F6','SẴN SÀNG CHO PRODUCTION',['URL localhost; auth tập trung ở Gateway.', 'Redis chưa dùng; SSE memory; chưa HA / tracing stack.'])
 ])
 for i,(tag,title,ls) in enumerate(items):
  col=i%3;row=i//3;x=60+col*1040;y=1822+row*145;c=GREEN if t else RED
  p.rect(x,y,1000,125,c,'#f7fcf8' if t else '#fffafa',r=12,sw=1.5)
  p.pill(x+16,y+15,50,tag,c)
  p.text(x+82,y+40,title,25,c,True)
  p.lines(x+20,y+77,ls,22,gap=32)
 # Footer legend.
 p.rect(60,2140,3080,89,'#bdc8d4','#fbfcfe',r=10,sw=1)
 p.line(88,2170,150,2170,INK,arrow=True)
 p.text(170,2177,'REST / Feign đồng bộ',21)
 p.line(520,2170,582,2170,PURPLE,True,True)
 p.text(602,2177,'Kafka bất đồng bộ',21)
 p.text(980,2177,'F1–F6: review / hướng khắc phục',21,GREEN if t else RED,True)
 p.text(3098,2177,'TO-BE: thiết kế đề xuất • không phải trạng thái đã triển khai' if t else 'AS-IS: cấu trúc code/config • không khẳng định dịch vụ đang chạy',21,MUTED,anchor='end')
 p.text(88,2211,'Căn cứ: backend/pom.xml • application.yaml • TripRepository • Saga / relay / Kafka listener • frontend state • docker-compose.yml • dev-start.sh',19,MUTED)
 p.text(3140,2260,'CCADRO  /  ARCHITECTURE REVIEW',18,MUTED,True,'end')


if __name__=='__main__':
 for target,name in [(False,'ccadro-architecture-current.svg'),(True,'ccadro-architecture-proposed.svg')]:
  p=Plate(target)
  for f in [top,services,data,flows,review]:f(p)
  p.write(name)
  print(OUT/name)
