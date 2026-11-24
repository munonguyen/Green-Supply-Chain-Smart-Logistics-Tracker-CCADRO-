import React, { createRef, useState } from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchField from '../shared/components/search/SearchField';
import SearchToolbar from '../shared/components/search/SearchToolbar';
import LegacySearchBar from '../shared/components/search/ElasticSearchBar';

function ControlledField(props) {
  const [value, setValue] = useState(props.initialValue ?? '');
  const { initialValue: _initialValue, ...rest } = props;
  return <SearchField {...rest} value={value} onValueChange={setValue} />;
}

describe('SearchField', () => {
  it('associates distinct labels with distinct searchbox IDs', () => {
    render(
      <>
        <SearchField label="Tìm xe" />
        <SearchField label="Tìm khách hàng" />
      </>
    );
    const vehicle = screen.getByRole('searchbox', { name: 'Tìm xe' });
    const customer = screen.getByRole('searchbox', { name: 'Tìm khách hàng' });
    expect(vehicle.id).not.toBe(customer.id);
    expect(screen.getByLabelText('Tìm xe')).toBe(vehicle);
  });

  it('retains an accessible label when the visible label is hidden', () => {
    render(<SearchField label="Tìm cuộc trò chuyện" hideLabel />);
    expect(screen.getByRole('searchbox', { name: 'Tìm cuộc trò chuyện' })).toBeInTheDocument();
  });

  it('reports the complete Vietnamese input to its owner without applying its own filtering', () => {
    const changed = vi.fn();
    render(<SearchField label="Tìm hàng" value="" onValueChange={changed} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sữa tươi Đà Lạt' } });
    expect(changed).toHaveBeenCalledWith('Sữa tươi Đà Lạt');
  });

  it('clears a controlled query, restores focus and does not submit the surrounding form', () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <ControlledField initialValue="container 01" />
      </form>
    );
    const input = screen.getByRole('searchbox');
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).not.toBeInTheDocument();
  });

  it('uses Escape to clear once, then allows Escape to reach the enclosing dialog', () => {
    const dialogKey = vi.fn();
    render(
      <div onKeyDown={dialogKey}>
        <ControlledField initialValue="VINAMILK" />
      </div>
    );
    const input = screen.getByRole('searchbox');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input).toHaveValue('');
    expect(dialogKey).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(dialogKey).toHaveBeenCalledOnce();
  });

  it('does not clear or override Escape while an IME composition is in progress', () => {
    const changed = vi.fn();
    render(<SearchField value="điều phối" onValueChange={changed} />);
    const input = screen.getByRole('searchbox');
    fireEvent.compositionStart(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.compositionEnd(input);
    fireEvent.keyDown(input, { key: 'Escape', isComposing: true });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(changed).toHaveBeenCalledWith('');
  });

  it('preserves Enter so the owning search form can submit normally', () => {
    render(<SearchField value="SH001" onValueChange={vi.fn()} />);
    const event = createEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' });
    fireEvent(screen.getByRole('searchbox'), event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('supports native props and an imperative DOM ref', () => {
    const ref = createRef();
    render(<SearchField ref={ref} id="shipment-lookup" name="shipmentCode" maxLength={50} />);
    expect(ref.current).toBe(screen.getByRole('searchbox'));
    expect(ref.current).toHaveAttribute('id', 'shipment-lookup');
    expect(ref.current).toHaveAttribute('name', 'shipmentCode');
    expect(ref.current).toHaveAttribute('maxlength', '50');
  });

  it('connects the error to the input, replacing hint text while preserving external descriptions', () => {
    const { rerender } = render(
      <SearchField id="cargo" hint="Nhập mã hoặc tên hàng" aria-describedby="external-help" />
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute(
      'aria-describedby',
      'external-help cargo-message'
    );
    rerender(
      <SearchField
        id="cargo"
        hint="Nhập mã hoặc tên hàng"
        error="Không tải được dữ liệu"
        aria-describedby="external-help"
      />
    );
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được dữ liệu');
    expect(screen.queryByText('Nhập mã hoặc tên hàng')).not.toBeInTheDocument();
  });

  it('announces loading without disabling typing or inventing a result count', () => {
    const changed = vi.fn();
    render(<SearchField loading onValueChange={changed} />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tìm kiếm');
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-busy', 'true');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mới' } });
    expect(changed).toHaveBeenCalledWith('mới');
  });

  it.each([{ disabled: true }, { readOnly: true }])(
    'hides clear when interaction is restricted: %j',
    (props) => {
      const changed = vi.fn();
      render(<SearchField value="SH001" onValueChange={changed} {...props} />);
      expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).not.toBeInTheDocument();
      fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Escape' });
      expect(changed).not.toHaveBeenCalled();
    }
  );
});

describe('SearchToolbar', () => {
  it('shows pending status instead of an empty result count while data is loading', () => {
    render(<SearchToolbar value="hàng" loading totalCount={0} matchedCount={0} />);
    expect(screen.queryByText('0 / 0 kết quả')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đang tìm kiếm');
    expect(screen.getByRole('searchbox')).toHaveAttribute('aria-busy', 'true');
  });

  it('places actual result counts outside the input and clear button', () => {
    render(
      <SearchToolbar
        label="Tìm vận đơn"
        value="SH001"
        onChange={vi.fn()}
        totalCount={12}
        matchedCount={2}
      />
    );
    const count = screen.getByText('2 / 12 kết quả');
    expect(count.closest('.search-field__control')).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Tìm vận đơn' })).toHaveValue('SH001');
    expect(screen.queryByText('Elastic')).not.toBeInTheDocument();
  });

  it('shows a genuine zero-match count but hides unspecified counts', () => {
    const { rerender } = render(
      <SearchToolbar value="không có" onChange={vi.fn()} totalCount={8} matchedCount={0} />
    );
    expect(screen.getByText('0 / 8 kết quả')).toBeInTheDocument();
    rerender(<SearchToolbar value="không có" onChange={vi.fn()} />);
    expect(screen.queryByText(/kết quả/)).not.toBeInTheDocument();
  });

  it('passes the next trash filter state while keeping its action separate from the input', () => {
    const toggle = vi.fn();
    const { rerender } = render(<SearchToolbar onToggleDeleted={toggle} deletedCount={3} />);
    const button = screen.getByRole('button', { name: 'Thùng rác (3)' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button.closest('.search-field')).toBeNull();
    fireEvent.click(button);
    expect(toggle).toHaveBeenLastCalledWith(true);
    rerender(<SearchToolbar onToggleDeleted={toggle} deletedCount={3} showDeleted />);
    fireEvent.click(screen.getByRole('button', { name: 'Thùng rác (3)' }));
    expect(toggle).toHaveBeenLastCalledWith(false);
  });

  it('keeps the legacy entry point working without forwarding obsolete styling props to the DOM', () => {
    render(
      <LegacySearchBar value="cũ" onChange={vi.fn()} minWidth={999} rounded={999} tookMs={5} />
    );
    const input = screen.getByRole('searchbox');
    expect(input).not.toHaveAttribute('minWidth');
    expect(input).not.toHaveAttribute('tookMs');
    expect(input).toHaveValue('cũ');
  });
});
