import React, { useEffect, useId, useState } from 'react';
import { Box, Check, ChevronRight, Layers3, Palette, Rotate3d, Truck, Wrench } from 'lucide-react';
import { CONTAINER_TYPES } from './containerPresentation';
import { computePartSafetyAssessment } from './containerSafetyIntelligence';
import './container-truck-model.css';

const verdict = status => status === 'PASS' ? 'Đạt' : status === 'FAIL' ? 'Không đạt' : 'Chưa kiểm tra';
const poly = points => points.map(p => p.join(',')).join(' ');

const TIER_VISUALS = {
  PENDING: { tier: 'PENDING', color: '#789a9e', fill: 'rgba(120, 154, 158, 0.08)', badge: 'Chưa đo' },
  A: { tier: 'A', color: '#10b981', fill: 'rgba(16, 185, 129, 0.44)', badge: 'Hạng A (≥85%)' },
  B: { tier: 'B', color: '#0ea5e9', fill: 'rgba(14, 165, 233, 0.42)', badge: 'Hạng B (70–84%)' },
  C: { tier: 'C', color: '#f59e0b', fill: 'rgba(245, 158, 11, 0.48)', badge: 'Hạng C (50–69%)' },
  D: { tier: 'D', color: '#ef4444', fill: 'rgba(239, 68, 68, 0.54)', badge: 'Hạng D (<50%)' }
};

const DEMO_RESULTS = {
  frame_corner_castings: { status: 'PASS', measurements: { _conditionPct: '95' } },
  floor_deck: { status: 'FAIL', measurements: { _conditionPct: '58' } },
  dry_floor_support: { status: 'FAIL', measurements: { _conditionPct: '58' } },
  flat_deck: { status: 'FAIL', measurements: { _conditionPct: '58' } },
  walls_roof: { status: 'PASS', measurements: { _conditionPct: '78' } },
  open_top_roof: { status: 'PASS', measurements: { _conditionPct: '78' } },
  doors_locking: { status: 'PASS', measurements: { _conditionPct: '95' } },
  cleanliness_cargo: { status: 'PASS', measurements: { _conditionPct: '78' } },
  csc_plate: { status: 'PASS', measurements: { _conditionPct: '95' } },
  tires_brakes_axle: { status: 'FAIL', measurements: { _conditionPct: '25' } },
  reefer_unit_mount: { status: 'FAIL', measurements: { _conditionPct: '58' } },
  reefer_power_control: { status: 'PASS', measurements: { _conditionPct: '95' } },
  reefer_setpoint_test: { status: 'PASS', measurements: { _conditionPct: '78' } },
  reefer_alarm_airflow: { status: 'FAIL', measurements: { _conditionPct: '25' } },
  reefer_insulation_drain: { status: 'PASS', measurements: { _conditionPct: '95' } }
};

function resolveQualityVisual(item, check) {
  const stats = computePartSafetyAssessment(item || { key: 'unknown' }, check);
  if (!stats.evaluated) return { ...TIER_VISUALS.PENDING, safetyPct: null };
  const pct = stats.safetyPct ?? (check?.status === 'PASS' ? 95 : 25);
  if (pct >= 85 && check?.status !== 'FAIL') return { ...TIER_VISUALS.A, safetyPct: pct };
  if (pct >= 70 && check?.status !== 'FAIL') return { ...TIER_VISUALS.B, safetyPct: pct };
  if (pct >= 50) return { ...TIER_VISUALS.C, safetyPct: pct };
  return { ...TIER_VISUALS.D, safetyPct: pct };
}

function worstZoneVisual(keys, visualsByKey) {
  const rank = { D: 4, C: 3, B: 2, A: 1, PENDING: 0 };
  let chosen = TIER_VISUALS.PENDING;
  for (const key of keys) {
    const v = visualsByKey[key];
    if (v && rank[v.tier] > rank[chosen.tier]) chosen = v;
  }
  return chosen;
}

function TruckDrawing({ type, side, id, visualsByKey = {}, activeKey = '', onSelectZone, templateKeys = new Set() }) {
  const short = type?.endsWith('20FT');
  const flat = type === 'FLAT_RACK', open = type === 'OPEN_TOP', reefer = type?.startsWith('REEFER');
  const end = short ? 700 : 940;
  const offset = short ? 100 : 0;
  const p = (x, y, z) => [65 + offset + x * .85 + (side ? 0 : y * .38), 346 + (side ? 0 : x * .055 - y * .28) - z * .72];
  const face = points => poly(points.map(v => p(...v)));
  const zoneClass = (base, visual, keys = []) =>
    `model-zone model-zone-${base} tier-${visual.tier}${keys.includes(activeKey) ? ' is-highlighted' : ''}`;
  const pickFirstKey = (keys) => keys.find((k) => templateKeys.has(k)) || keys[0];
  const bindZone = (keys) => ({
    onClick: (e) => {
      const targetKey = pickFirstKey(keys);
      if (targetKey) onSelectZone?.(targetKey, e.currentTarget);
    },
    style: { cursor: 'pointer' }
  });
  const tireVis = worstZoneVisual(['tires_brakes_axle'], visualsByKey);
  const wheel = (x, y, index) => { const [cx, cy] = p(x, y, 24); const isTrailer = x >= 300; return <g key={`${x}-${y}-${index}`} transform={`translate(${cx} ${cy})`} {...(isTrailer ? bindZone(['tires_brakes_axle']) : {})}>
    <ellipse rx={side ? 27 : 25} ry="28" fill={`url(#${id}-tire)`} stroke={isTrailer && tireVis.tier !== 'PENDING' ? tireVis.color : '#121e2b'} strokeWidth={isTrailer && tireVis.tier !== 'PENDING' ? '4' : '3'} />
    {isTrailer && <ellipse rx={side ? 32 : 30} ry="33" fill={tireVis.tier !== 'PENDING' ? tireVis.fill : 'transparent'} stroke={tireVis.color} strokeWidth={tireVis.tier !== 'PENDING' ? '2.5' : '1.2'} strokeDasharray={tireVis.tier === 'PENDING' ? '4 4' : undefined} className={zoneClass('tire-ring', tireVis, ['tires_brakes_axle'])} />}
    <ellipse rx="16" ry="18" fill="#8c9aa6" stroke="#d4dde2" strokeWidth="2" /><ellipse rx="9" ry="11" fill="#d7e0e5" />
    <circle r="4" fill="#5f727f" />{Array.from({ length: 6 }, (_, n) => <circle key={n} cx={Math.cos(n * Math.PI / 3) * 12} cy={Math.sin(n * Math.PI / 3) * 13} r="1.5" fill="#445765" />)}
  </g>; };
  const rearAxles = [end - 170, end - 105, end - 40];
  const nearSide = [[300, 0, 110], [end, 0, 110], [end, 0, 355], [300, 0, 355]];
  const frameVis = worstZoneVisual(['frame_corner_castings', 'flat_fold_locks', 'open_top_top_rails'], visualsByKey);
  const wallVis = worstZoneVisual(['walls_roof', 'open_top_roof'], visualsByKey);
  const floorVis = worstZoneVisual(['floor_deck', 'dry_floor_support', 'flat_deck', 'flat_lashing_points'], visualsByKey);
  const doorVis = worstZoneVisual(['doors_locking'], visualsByKey);
  const cargoVis = worstZoneVisual(['cleanliness_cargo'], visualsByKey);
  const cscVis = worstZoneVisual(['csc_plate'], visualsByKey);
  const reeferVis = worstZoneVisual(
    ['reefer_unit_mount', 'reefer_power_control', 'reefer_setpoint_test', 'reefer_alarm_airflow', 'reefer_insulation_drain'],
    visualsByKey
  );
  const badgeAt = (x, y, z, vis, label) => {
    if (vis.tier === 'PENDING' || vis.safetyPct == null) return null;
    const [bx, by] = p(x, y, z);
    return (
      <g className="model-zone-tag" transform={`translate(${bx} ${by})`} pointerEvents="none">
        <rect x="-28" y="-11" width="56" height="22" rx="11" fill={vis.color} stroke="#ffffff" strokeWidth="1.6" />
        <text x="0" y="3.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="800">
          {label ? `${label} ` : ''}{vis.safetyPct}%
        </text>
      </g>
    );
  };
  return <svg viewBox="0 0 1000 480" role="img" aria-label={`Mô hình xe container gồm đầu kéo, sơ mi rơ moóc và ${CONTAINER_TYPES[type] || type}`}>
    <defs>
      <linearGradient id={`${id}-cab`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#19bda4" /><stop offset="1" stopColor="#087e78" /></linearGradient>
      <linearGradient id={`${id}-front`}><stop stopColor="#087e78" /><stop offset="1" stopColor="#07625f" /></linearGradient>
      <linearGradient id={`${id}-container`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f2f5f3" /><stop offset="1" stopColor="#c4d3d1" /></linearGradient>
      <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#244654" /><stop offset="1" stopColor="#102c38" /></linearGradient>
      <radialGradient id={`${id}-tire`}><stop stopColor="#3f4a54" /><stop offset="1" stopColor="#17212b" /></radialGradient>
      <linearGradient id={`${id}-shadow`}><stop stopColor="#0a454b" stopOpacity="0" /><stop offset=".5" stopColor="#0a454b" stopOpacity=".14" /><stop offset="1" stopColor="#0a454b" stopOpacity="0" /></linearGradient>
    </defs>
    <ellipse cx="510" cy="386" rx={short ? 330 : 430} ry="28" fill={`url(#${id}-shadow)`} />
    {!side && [105, 245, ...rearAxles].map((x, index) => wheel(x, 138, index))}
    {/* Chassis, fifth wheel and landing legs. */}
    <polygon points={face([[150,0,62],[end+8,0,62],[end+8,142,62],[150,142,62]])} fill="#475c69" stroke="#334754" strokeWidth="2" />
    <polygon points={face([[150,0,62],[end+8,0,62],[end+8,0,91],[150,0,91]])} fill="#263e4a" />
    <polygon points={face([[275,0,91],[end+8,0,91],[end+8,140,91],[275,140,91]])} fill="#92a5a9" />
    <polygon points={face([[350,0,90],[350,0,104],[end,0,104],[end,0,90]])} fill="#637b84" />
    <polygon points={face([[390,8,0],[390,8,90],[403,8,90],[403,8,0]])} fill="#4a6370" />
    <path d={`M${p(376,8,0).join(' ')}h30`} stroke="#4a6370" strokeWidth="5" />
    <polygon points={face([[295,0,30],[350,0,30],[350,0,70],[295,0,70]])} fill="#d6e1e4" stroke="#91a5ac" />
    {[end-170,end-105,end-40].map(x => <polygon key={x} points={face([[x-34,0,75],[x+34,0,75],[x+34,0,95],[x-34,0,95]])} fill="#1b3342" />)}
    {/* Container equipment variants share the actual trailer, not a floating box. */}
    {flat ? <g stroke="#667e87" strokeWidth="2">
      <polygon points={face([[300,0,110],[end,0,110],[end,140,110],[300,140,110]])} fill="#a6babd" />
      {[300,end].map(x => <g key={x}><polygon points={face([[x,0,110],[x,0,310],[x,140,310],[x,140,110]])} fill="#d3dfdf" />
        {[15,125].map(y => <path key={y} d={`M${p(x,y,115).join(' ')}L${p(x,y,310).join(' ')}`} strokeWidth="9" />)}</g>)}
      {Array.from({length:9},(_,n) => <path key={n} d={`M${p(325+(end-350)*n/8,0,110).join(' ')}L${p(325+(end-350)*n/8,140,110).join(' ')}`} />)}
    </g> : <g stroke="#789293" strokeWidth="1.6">
      <polygon points={poly(nearSide.map(v => p(...v)))} fill={`url(#${id}-container)`} />
      <polygon points={face([[300,0,355],[300,140,355],[end,140,355],[end,0,355]])} fill={open ? '#8daba9' : '#e7efec'} />
      {!side && <polygon points={face([[end,0,110],[end,140,110],[end,140,355],[end,0,355]])} fill="#bacccb" />}
      {open && <><polygon points={face([[322,14,355],[322,125,355],[end-22,125,355],[end-22,14,355]])} fill="#243f46" />
        {[.15,.5,.85].map(t => <path key={t} d={`M${p(300+(end-300)*t,0,355).join(' ')}L${p(300+(end-300)*t,140,355).join(' ')}`} stroke="#a7bfba" strokeWidth="5" />)}</>}
      {Array.from({length:short?13:23},(_,n) => {const x=315+n*(end-330)/(short?12:22);return <g key={n}>
        <path d={`M${p(x,0,125).join(' ')}L${p(x,0,342).join(' ')}`} stroke="#a5bab8" strokeWidth="4" />
        <path d={`M${p(x+4,0,125).join(' ')}L${p(x+4,0,342).join(' ')}`} stroke="#f6f9f6" strokeWidth="2" />
      </g>;})}
      <polygon points={face([[end-105,0,136],[end-18,0,136],[end-18,0,178],[end-105,0,178]])} fill="#dfe8df" stroke="#899f99" />
      {!side && <g stroke="#657d81" strokeWidth="2.5">{[42,98].map(y => <path key={y} d={`M${p(end,y,127).join(' ')}L${p(end,y,338).join(' ')}`} />)}<path d={`M${p(end,70,112).join(' ')}L${p(end,70,351).join(' ')}`} />
        {[45,95].map(y => <path key={y} d={`M${p(end,y-9,210).join(' ')}L${p(end,y+9,210).join(' ')}`} strokeWidth="4" />)}</g>}
      <g transform={`translate(${p(reefer?420:370,0,250).join(' ')})`}><text fill="#5d7776" stroke="none" fontSize="20" fontWeight="800" letterSpacing="3">CCADRO</text><text y="19" fill="#6b8381" stroke="none" fontSize="8" letterSpacing="2">GREEN LOGISTICS</text></g>
      {reefer && <g stroke="#71898e"><polygon points={face([[305,0,145],[385,0,145],[385,0,337],[305,0,337]])} fill="#eef3f1" />
        <polygon points={face([[316,0,292],[373,0,292],[373,0,322],[316,0,322]])} fill="#1f4a53" />
        {[207,256].map(z => {const [cx,cy]=p(345,0,z);return <g key={z}><circle cx={cx} cy={cy} r="15" fill="#afc6c7" /><circle cx={cx} cy={cy} r="5" fill="#557f87" />{[0,60,120].map(angle=><path key={angle} transform={`rotate(${angle} ${cx} ${cy})`} d={`M${cx-12} ${cy}h24`} stroke="#557f87" />)}</g>;})}
        {[157,165,173].map(z=><path key={z} d={`M${p(317,0,z).join(' ')}L${p(372,0,z).join(' ')}`} strokeWidth="2" />)}
      </g>}
    </g>}
    {/* Tractor cab, glazing, mirrors, fuel tank and access steps. */}
    <g stroke="#096b68" strokeWidth="1.7">
      <polygon points={face([[18,0,65],[18,0,190],[75,0,304],[210,0,304],[242,0,245],[242,0,65]])} fill={`url(#${id}-cab)`} />
      {!side && <polygon points={face([[18,0,65],[18,140,65],[18,140,190],[75,140,304],[75,0,304],[18,0,190]])} fill={`url(#${id}-front)`} />}
      <polygon points={face([[75,0,304],[75,140,304],[210,140,304],[210,0,304]])} fill="#32c7b0" />
      <polygon points={face([[70,0,205],[99,0,273],[184,0,273],[213,0,225],[213,0,205]])} fill={`url(#${id}-glass)`} stroke="#7bddd0" strokeWidth="2" />
      <path d={`M${p(112,0,205).join(' ')}L${p(129,0,273).join(' ')}`} stroke="#079c8f" strokeWidth="4" />
      {!side && <polygon points={face([[32,6,195],[78,6,285],[78,132,285],[32,132,195]])} fill={`url(#${id}-glass)`} stroke="#54b5ab" />}
      <path d={`M${p(216,0,105).join(' ')}L${p(216,0,196).join(' ')}L${p(82,0,196).join(' ')}`} fill="none" stroke="#05766f" />
      <path d={`M${p(182,0,188).join(' ')}L${p(201,0,188).join(' ')}`} stroke="#d3f0e7" strokeWidth="4" strokeLinecap="round" />
      <path d={`M${p(82,0,230).join(' ')}L${p(61,-16,228).join(' ')}L${p(53,-16,198).join(' ')}`} fill="none" stroke="#294552" strokeWidth="5" />
      <polygon points={face([[43,-17,204],[61,-17,204],[61,-17,239],[43,-17,239]])} fill="#294552" stroke="#72959d" />
      <polygon points={face([[18,0,70],[18,140,70],[18,140,101],[18,0,101]])} fill="#c7d7d9" stroke="#839fa8" />
      {[24,46].map(z=><path key={z} d={`M${p(165,0,z+40).join(' ')}L${p(225,0,z+40).join(' ')}`} stroke="#c1d4d5" strokeWidth="8" />)}
      {!side && <><polygon points={face([[18,20,112],[18,116,112],[18,116,162],[18,20,162]])} fill="#153c45" stroke="#1f5158" />
        {[124,137,150].map(z=><path key={z} d={`M${p(18,27,z).join(' ')}L${p(18,109,z).join(' ')}`} stroke="#8caaaa" strokeWidth="2" />)}
        {[9,121].map(y=><path key={y} d={`M${p(18,y,115).join(' ')}L${p(18,y+15,115).join(' ')}`} stroke="#ffedb6" strokeWidth="6" />)}</>}
      <polygon points={face([[250,0,32],[292,0,32],[292,0,78],[250,0,78]])} fill="#b9cbd0" stroke="#7b959f" />
    </g>
    {[105,245,...rearAxles].map((x,index)=>wheel(x,0,index))}
    <path d={`M${p(72,0,51).join(' ')}Q${p(105,0,100).join(' ')} ${p(139,0,51).join(' ')}`} fill="none" stroke="#087d75" strokeWidth="10" />
    {[300,end].map(x=><g key={x}>{[0,140].map(y=><polygon key={y} points={face([[x-7,y,106],[x+7,y,106],[x+7,y,123],[x-7,y,123]])} fill={frameVis.tier !== 'PENDING' ? frameVis.color : '#b48c42'} stroke="#80652e" />)}</g>)}
    {/* Color-coded ISO 55000 structural & component quality overlays (interactive even when pending) */}
    <g className="model-quality-overlays">
      <polygon
        className={zoneClass('floor', floorVis, ['floor_deck', 'dry_floor_support', 'flat_deck', 'flat_lashing_points'])}
        points={face([[300,0,93],[end,0,93],[end,0,115],[300,0,115]])}
        fill={floorVis.fill}
        stroke={floorVis.color}
        strokeWidth={floorVis.tier === 'PENDING' ? '1.3' : '2.8'}
        strokeDasharray={floorVis.tier === 'PENDING' ? '6 4' : undefined}
        {...bindZone(['floor_deck', 'dry_floor_support', 'flat_deck', 'flat_lashing_points'])}
      />
      {!flat && (
        <>
          <polygon
            className={zoneClass('roof', wallVis, ['walls_roof', 'open_top_roof'])}
            points={face([[300,0,355],[300,140,355],[end,140,355],[end,0,355]])}
            fill={wallVis.fill}
            stroke={wallVis.color}
            strokeWidth={wallVis.tier === 'PENDING' ? '1.2' : '2.6'}
            strokeDasharray={wallVis.tier === 'PENDING' ? '6 4' : undefined}
            {...bindZone(['walls_roof', 'open_top_roof'])}
          />
          <polygon
            className={zoneClass('wall', wallVis, ['walls_roof', 'open_top_roof'])}
            points={face([[300,0,115],[end,0,115],[end,0,353],[300,0,353]])}
            fill={wallVis.tier === 'PENDING' ? 'transparent' : wallVis.fill}
            stroke={wallVis.color}
            strokeWidth={wallVis.tier === 'PENDING' ? '1' : '2'}
            strokeDasharray={wallVis.tier === 'PENDING' ? '5 5' : undefined}
            {...bindZone(['walls_roof', 'open_top_roof'])}
          />
        </>
      )}
      {!flat && (
        <polygon
          className={zoneClass('cargo', cargoVis, ['cleanliness_cargo'])}
          points={face([[398,0,150],[end-122,0,150],[end-122,0,318],[398,0,318]])}
          fill={cargoVis.fill}
          stroke={cargoVis.color}
          strokeDasharray="6 4"
          strokeWidth={cargoVis.tier === 'PENDING' ? '1.2' : '2.4'}
          {...bindZone(['cleanliness_cargo'])}
        />
      )}
      {!flat && !side && (
        <polygon
          className={zoneClass('doors', doorVis, ['doors_locking'])}
          points={face([[end,0,110],[end,140,110],[end,140,355],[end,0,355]])}
          fill={doorVis.fill}
          stroke={doorVis.color}
          strokeWidth={doorVis.tier === 'PENDING' ? '1.4' : '3'}
          strokeDasharray={doorVis.tier === 'PENDING' ? '5 4' : undefined}
          {...bindZone(['doors_locking'])}
        />
      )}
      {!flat && (
        <polygon
          className={zoneClass('csc', cscVis, ['csc_plate'])}
          points={face([[end-108,0,133],[end-15,0,133],[end-15,0,181],[end-108,0,181]])}
          fill={cscVis.fill}
          stroke={cscVis.color}
          strokeWidth={cscVis.tier === 'PENDING' ? '1.4' : '2.8'}
          strokeDasharray={cscVis.tier === 'PENDING' ? '4 3' : undefined}
          {...bindZone(['csc_plate'])}
        />
      )}
      {frameVis.tier !== 'PENDING' && (
        <polygon
          className={zoneClass('frame', frameVis, ['frame_corner_castings', 'flat_fold_locks', 'open_top_top_rails'])}
          points={poly(nearSide.map(v => p(...v)))}
          fill="none"
          stroke={frameVis.color}
          strokeWidth="3.6"
          pointerEvents="none"
        />
      )}
      {reefer && (
        <g
          className={zoneClass('reefer', reeferVis, ['reefer_unit_mount', 'reefer_power_control', 'reefer_setpoint_test', 'reefer_alarm_airflow', 'reefer_insulation_drain'])}
          {...bindZone(['reefer_unit_mount', 'reefer_power_control', 'reefer_setpoint_test', 'reefer_alarm_airflow', 'reefer_insulation_drain'])}
        >
          <polygon
            points={face([[305,0,145],[385,0,145],[385,0,337],[305,0,337]])}
            fill={reeferVis.fill}
            stroke={reeferVis.color}
            strokeWidth={reeferVis.tier === 'PENDING' ? '1.4' : '3.2'}
            strokeDasharray={reeferVis.tier === 'PENDING' ? '5 4' : undefined}
          />
          {reeferVis.tier !== 'PENDING' && [207, 256].map(z => {
            const [cx, cy] = p(345, 0, z);
            return (
              <circle
                key={z}
                cx={cx}
                cy={cy}
                r="16"
                fill="none"
                stroke={reeferVis.color}
                strokeWidth="2.4"
                className={reeferVis.tier === 'A' || reeferVis.tier === 'B' ? 'reefer-fan-active' : 'reefer-fan-alert'}
              />
            );
          })}
        </g>
      )}
      {badgeAt(335, 0, 345, frameVis, 'Khung')}
      {!flat && badgeAt((398 + end - 122) / 2, 70, 355, wallVis, 'Vách')}
      {badgeAt((300 + end) / 2, 0, 104, floorVis, 'Sàn')}
      {!flat && !side && badgeAt(end, 70, 232, doorVis, 'Cửa')}
      {badgeAt(end - 105, 0, 48, tireVis, 'Lốp')}
      {reefer && badgeAt(345, 0, 230, reeferVis, 'Lạnh')}
    </g>
    <g fill="#637c83" fontSize="10" fontWeight="700" letterSpacing="1.2"><text x={short?195:95} y="460">ĐẦU KÉO</text><text x={short?480:530} y="460">SƠ MI RƠ MOÓC + {CONTAINER_TYPES[type]?.toLocaleUpperCase('vi') || 'CONTAINER'}</text></g>
  </svg>;
}

export default function ContainerInspectionModel({ type, template, results, telemetryPreview = {}, onSelect, selectedKey, openPointKey, pointDialogId }) {
  const id = useId().replace(/:/g,'');
  const [side, setSide] = useState(false);
  const [zone, setZone] = useState('ALL');
  const [hoveredKey, setHoveredKey] = useState('');
  const [demoPalette, setDemoPalette] = useState(false);
  useEffect(() => {
    if (!openPointKey) return;
    const reeferPoint = openPointKey.startsWith('reefer_');
    setZone(current => (current === 'BODY' && reeferPoint) || (current === 'REEFER' && !reeferPoint) ? 'ALL' : current);
  }, [openPointKey]);
  const short = type?.endsWith('20FT');
  const shift = short ? -85 : 0;
  const positions = {
    frame_corner_castings: [short ? 415 : 315, 75],
    floor_deck: [585 + shift, 345],
    walls_roof: [600 + shift, 78],
    doors_locking: [945 + shift, 195],
    cleanliness_cargo: [650 + shift, 245],
    csc_plate: [900 + shift, 328],
    tires_brakes_axle: [short ? 595 : 735, 392],
    dry_floor_support: [435 + shift, 365],
    flat_deck: [450 + shift, 230],
    flat_lashing_points: [790 + shift, 290],
    flat_fold_locks: [350, 170],
    open_top_roof: [490 + shift, 78],
    open_top_top_rails: [755 + shift, 78]
  };
  const end = short ? 700 : 940;
  const project = (x, y, z) => [
    65 + (short ? 100 : 0) + x * 0.85 + (side ? 0 : y * 0.38),
    346 + (side ? 0 : x * 0.055 - y * 0.28) - z * 0.72
  ];
  const anchors = {
    frame_corner_castings: project(300, 0, 350),
    floor_deck: project((300 + end) / 2, 0, 110),
    walls_roof: project((300 + end) / 2, 70, 355),
    doors_locking: project(end, 70, 240),
    cleanliness_cargo: project((300 + end) / 2, 0, 240),
    csc_plate: project(end - 45, 0, 155),
    tires_brakes_axle: project(end - 105, 0, 24),
    dry_floor_support: project(470, 0, 110),
    flat_deck: project(470, 60, 110),
    flat_lashing_points: project(end - 120, 0, 110),
    flat_fold_locks: project(300, 0, 250),
    open_top_roof: project(470, 70, 355),
    open_top_top_rails: project(end - 100, 0, 355)
  };
  let reeferIndex=0;
  const effectiveResults = demoPalette
    ? DEMO_RESULTS
    : Object.fromEntries(
        template.map(item => [item.key, results[item.key] || telemetryPreview[item.key]])
      );
  const visualsByKey = Object.fromEntries(
    template.map(item => [item.key, resolveQualityVisual(item, effectiveResults[item.key])])
  );
  const templateKeys = new Set(template.map(t => t.key));
  const points=template.map((item,index)=>({ ...item, number:index+1, visual: visualsByKey[item.key] || TIER_VISUALS.PENDING,
    position:item.key.startsWith('reefer_') ? [260+reeferIndex++*145,430] : positions[item.key] || [620+shift,200] }));
  const selected=points.find(item=>item.key===selectedKey);
  const activeVisualKey = hoveredKey || openPointKey || selectedKey || '';
  const visible=points.filter(item=>zone==='ALL'||(zone==='REEFER'?item.key.startsWith('reefer_'):!item.key.startsWith('reefer_')));
  return <div className="container-inspection-model truck-inspection-model">
    <header className="truck-model-toolbar"><div><span className="truck-model-eyebrow">SƠ ĐỒ PHƯƠNG TIỆN · BẢN ĐỒ MÀU CHẤT LƯỢNG</span><h3><Truck size={17} /> Xe đầu kéo chở container</h3></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="button"
          className="truck-demo-palette-btn"
          aria-pressed={demoPalette}
          onClick={() => setDemoPalette(v => !v)}
          title="Xem trước hiệu ứng 4 màu đánh giá chất lượng A–D trực tiếp trên thân container"
        >
          <Palette size={14} /> {demoPalette ? 'Đang xem mẫu màu A–D' : 'Xem thử màu A–D'}
        </button>
        <div className="truck-view-switch" aria-label="Góc nhìn xe"><button type="button" aria-pressed={!side} onClick={()=>setSide(false)}><Rotate3d size={14} /> Phối cảnh</button><button type="button" aria-pressed={side} onClick={()=>setSide(true)}><Layers3 size={14} /> Bên hông</button></div>
      </div>
    </header>
    <div className="truck-model-zones" aria-label="Nhóm điểm kiểm tra"><button type="button" aria-pressed={zone==='ALL'} onClick={()=>setZone('ALL')}>Tất cả <span>{points.length}</span></button><button type="button" aria-pressed={zone==='BODY'} onClick={()=>setZone('BODY')}>Thân & kết cấu</button>{type?.startsWith('REEFER')&&<button type="button" aria-pressed={zone==='REEFER'} onClick={()=>setZone('REEFER')}>Cụm lạnh</button>}</div>
    <div className={`container-model-drawing truck-model-stage${side?' is-side-view':''}`}>
      <TruckDrawing type={type} side={side} id={id} visualsByKey={visualsByKey} activeKey={activeVisualKey} onSelectZone={onSelect} templateKeys={templateKeys} />
      <svg className="truck-model-callouts" viewBox="0 0 1000 480" aria-hidden="true">{visible.map((item,index)=>{const anchor=anchors[item.key] || project(345,0,180+index%5*25);return <path key={item.key} className={`callout-tier-${item.visual.tier}${activeVisualKey===item.key?' is-active':''}`} d={`M${item.position[0]} ${item.position[1]} L${anchor[0]} ${anchor[1]}`} />;})}</svg>
      {visible.map(point=><button type="button" key={point.key} className={`container-model-point truck-model-point state-${results[point.key]?.status || 'PENDING'} tier-${point.visual.tier}${selectedKey===point.key?' is-active':''}`} style={{left:`${point.position[0]/10}%`,top:`${point.position[1]/4.8}%`}}
        aria-label={`${point.number}. ${point.label} · ${verdict(results[point.key]?.status)}`} aria-pressed={selectedKey===point.key} title={point.visual.safetyPct!=null?`${point.label} · ${point.visual.safetyPct}% (${point.visual.badge})`:point.label} data-inspection-point={point.key} aria-haspopup="dialog" aria-expanded={openPointKey===point.key} aria-controls={openPointKey===point.key?pointDialogId:undefined} onMouseEnter={()=>setHoveredKey(point.key)} onMouseLeave={()=>setHoveredKey('')} onClick={event=>onSelect(point.key,event.currentTarget)}>{results[point.key]?.status==='PASS'?<Check size={14}/>:point.number}</button>)}
    </div>
    <div className="truck-model-selection">{selected ? (() => {
      const partStats = computePartSafetyAssessment(selected, results[selected.key]);
      return <>
        <span className={`truck-selection-number state-${results[selected.key]?.status || 'PENDING'}`}>{selected.number}</span>
        <div>
          <span>ĐIỂM ĐANG CHỌN</span>
          <strong>{selected.label}</strong>
          {partStats.evaluated && (
            <small className="truck-selection-metrics">
              An toàn: {partStats.safetyPct}% · Hư hại: {partStats.damagePct}% · Sửa phục hồi: +{partStats.repairablePct}%
            </small>
          )}
        </div>
        <b>{verdict(results[selected.key]?.status)}</b>
        <ChevronRight size={16}/>
      </>;
    })()
      : <><Box size={22}/><div><strong>Chọn một điểm trên xe để kiểm tra chỉ số an toàn</strong><span>Bấm trực tiếp vào số trên mô hình hoặc thẻ bộ phận ngay bên dưới.</span></div></>}</div>
    <div className="truck-model-part-pills" aria-label="Tóm tắt chỉ số từng điểm trên xe">
      {visible.map(point => {
        const res = results[point.key];
        const stats = computePartSafetyAssessment(point, res);
        return (
          <button
            type="button"
            key={point.key}
            className={`truck-part-pill state-${res?.status || 'PENDING'} tier-${point.visual.tier}${selectedKey === point.key ? ' is-active' : ''}`}
            onMouseEnter={() => setHoveredKey(point.key)}
            onMouseLeave={() => setHoveredKey('')}
            onClick={event => onSelect(point.key, event.currentTarget)}
          >
            <span className="truck-part-num">{point.number}</span>
            <span className="truck-part-name">{point.label}</span>
            <span className="truck-part-score">
              {stats.evaluated ? `AT ${stats.safetyPct}%` : 'Chưa đo'}
              {stats.evaluated && stats.damagePct > 0 && (
                <em title={stats.recommendedAction}>
                  <Wrench size={10} /> Hỏng {stats.damagePct}% · Sửa {stats.repairablePct}%
                </em>
              )}
            </span>
          </button>
        );
      })}
    </div>
    <div className="container-model-legend truck-model-legend" aria-label="Thang màu đánh giá chất lượng AHI">
      <span><i /> Chưa đo</span>
      <span><i className="tier-a" /> Hạng A (≥85%)</span>
      <span><i className="tier-b" /> Hạng B (70–84%)</span>
      <span><i className="tier-c" /> Hạng C (50–69%)</span>
      <span><i className="tier-d" /> Hạng D (&lt;50%)</span>
      <small>{CONTAINER_TYPES[type] || type}</small>
    </div>
  </div>;
}
