import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

const groups = [
  {
    label: 'Ưu tiên kiểm tra',
    matches: (key) => ['seal', 'csc-expired', 'temperature-alarm-review'].includes(key)
  },
  {
    label: 'Hồ sơ và phân công',
    short: 'Hồ sơ',
    matches: (key) => /^(company|driver|vehicle|shipment|origin|destination|csc|acep)/.test(key)
  },
  {
    label: 'Theo dõi hành trình',
    short: 'Theo dõi',
    matches: (key) => ['telemetry', 'position', 'eta'].includes(key)
  },
  { label: 'Chuỗi lạnh', short: 'Chuỗi lạnh', matches: () => true }
];

export default function ContainerAttention({ code, issues }) {
  if (!issues.length) {
    return (
      <span className="container-attention-clear">
        <CheckCircle2 size={14} aria-hidden="true" /> Không có cảnh báo
      </span>
    );
  }

  const grouped = groups.map(() => []);
  for (const issue of issues) {
    grouped[groups.findIndex(({ matches }) => matches(issue.key))].push(issue);
  }
  const priority = grouped[0].length;
  const preview = priority
    ? grouped[0][0].label
    : groups.filter((_, index) => grouped[index].length).map(({ short }) => short).join(' · ');
  const summaryLabel = `${code}: ${issues.length} điểm cần chú ý${priority ? `, ${priority} ưu tiên` : ''}. ${preview}`;
  const Icon = priority ? AlertCircle : AlertTriangle;

  return (
    <details
      className={'container-attention' + (priority ? ' container-attention-priority' : '')}
      onClick={(event) => event.stopPropagation()}
    >
      <summary aria-label={summaryLabel}>
        <span className="container-attention-count">
          <Icon size={15} aria-hidden="true" /> {issues.length} cần chú ý
        </span>
        {priority > 0 && <span className="container-attention-priority-label">{priority} ưu tiên</span>}
        <ChevronDown className="container-attention-chevron" size={15} aria-hidden="true" />
        <span className="container-attention-preview">{preview}</span>
      </summary>
      <div className="container-attention-groups">
        {groups.map(({ label }, index) => grouped[index].length > 0 && (
          <div key={label} className={index === 0 ? 'container-attention-group-priority' : undefined}>
            <strong>{label} <span>{grouped[index].length}</span></strong>
            <ul>
              {grouped[index].map(({ key, label: issueLabel }) => <li key={key}>{issueLabel}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
