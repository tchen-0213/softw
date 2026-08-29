import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

const dispatch = vi.hoisted(() => vi.fn());
vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));

import CartItem from '../src/components/cart/CartItem.jsx';
import CreditBadge from '../src/components/credit/CreditBadge.jsx';
import AddressManager from '../src/components/user/AddressManager.jsx';
import { removeFromCart, updateQuantity } from '../src/store/cartSlice.js';

describe('通用业务组件', () => {
  test('购物车项回传增减、输入和删除动作并限制库存', async () => {
    const user = userEvent.setup();
    const item = { id: 1, name: '键盘', price: 20, quantity: 2, stock: 2 };
    render(<CartItem item={item} />);
    expect(screen.getByText('库存: 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '-' }));
    expect(dispatch).toHaveBeenCalledWith(updateQuantity({ id: 1, quantity: 1 }));
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '1' } });
    expect(dispatch).toHaveBeenCalledWith(updateQuantity({ id: 1, quantity: 1 }));
    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(dispatch).toHaveBeenCalledWith(removeFromCart(1));
  });

  test('信用徽章按分数与显式等级展示进度和最高等级', () => {
    const { rerender } = render(<CreditBadge score={125} />);
    expect(screen.getByText('银牌信用')).toBeInTheDocument();
    expect(screen.getByText('距下一等级还差 25 分')).toBeInTheDocument();
    rerender(<CreditBadge level="钻石会员" score={190} compact showScore={false} className="extra" />);
    expect(screen.getByText('钻石信用').closest('.credit-badge')).toHaveClass('is-compact', 'extra');
    expect(screen.queryByText('信用分')).not.toBeInTheDocument();
  });

  test('新增首个地址会自动设为默认并自动选中', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(12345);
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddressManager addresses={[]} onChange={onChange} selectable onSelect={onSelect} />);
    await user.click(screen.getByRole('button', { name: '新增地址' }));
    await user.type(screen.getByLabelText('收货人'), '张三');
    await user.type(screen.getByLabelText('手机号'), '13800138000');
    await user.type(screen.getByLabelText('详细地址'), '测试路 1 号');
    await user.click(screen.getByRole('button', { name: '保存地址' }));
    expect(onChange).toHaveBeenCalledWith([{ id: '12345', name: '张三', phone: '13800138000', address: '测试路 1 号', isDefault: true }]);
    expect(onSelect).toHaveBeenCalledWith('12345');
  });

  test('地址支持设默认、选择和删除后的回退选择', async () => {
    const addresses = [
      { id: '1', name: '甲', phone: '1', address: 'A', isDefault: true },
      { id: '2', name: '乙', phone: '2', address: 'B', isDefault: false }
    ];
    const onChange = vi.fn();
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<AddressManager addresses={addresses} onChange={onChange} selectedAddressId="2" onSelect={onSelect} selectable />);
    await user.click(screen.getAllByRole('radio')[0]);
    expect(onSelect).toHaveBeenCalledWith('1');
    await user.click(screen.getByRole('button', { name: '设为默认' }));
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ id: '1', isDefault: false }), expect.objectContaining({ id: '2', isDefault: true })]);
    await user.click(screen.getAllByRole('button', { name: '删除' })[1]);
    expect(onSelect).toHaveBeenCalledWith('1');
  });
});
