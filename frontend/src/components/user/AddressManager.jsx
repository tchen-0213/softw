import React, { useState } from 'react';

const emptyAddressForm = {
  name: '',
  phone: '',
  address: '',
  isDefault: false
};

const AddressManager = ({
  addresses,
  onChange,
  selectedAddressId,
  onSelect,
  selectable = false
}) => {
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAddressForm);

  const startAdd = () => {
    setEditingId('new');
    setForm({
      ...emptyAddressForm,
      isDefault: addresses.length === 0
    });
  };

  const startEdit = (address) => {
    setEditingId(address.id);
    setForm({
      name: address.name,
      phone: address.phone,
      address: address.address,
      isDefault: address.isDefault
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyAddressForm);
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const saveAddress = (event) => {
    event.preventDefault();
    const addressId = editingId === 'new' ? String(Date.now()) : editingId;
    const nextAddress = {
      id: addressId,
      name: form.name.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      isDefault: form.isDefault || addresses.length === 0
    };

    const existing = addresses.some(address => address.id === addressId);
    let nextAddresses = existing
      ? addresses.map(address => (address.id === addressId ? nextAddress : address))
      : [...addresses, nextAddress];

    if (nextAddress.isDefault) {
      nextAddresses = nextAddresses.map(address => ({
        ...address,
        isDefault: address.id === addressId
      }));
    }

    onChange(nextAddresses);
    if (selectable && (!selectedAddressId || editingId === 'new')) {
      onSelect?.(addressId);
    }
    cancelEdit();
  };

  const deleteAddress = (addressId) => {
    const nextAddresses = addresses.filter(address => address.id !== addressId);
    onChange(nextAddresses);
    if (selectedAddressId === addressId) {
      onSelect?.(nextAddresses[0]?.id || '');
    }
  };

  const setDefaultAddress = (addressId) => {
    onChange(addresses.map(address => ({
      ...address,
      isDefault: address.id === addressId
    })));
  };

  return (
    <div className="address-manager">
      <div className="address-manager-header">
        <h4>收货地址</h4>
        <button type="button" className="button button-primary" onClick={startAdd}>
          新增地址
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="address-empty">暂无收货地址，请新增后再结算。</div>
      ) : (
        <div className="address-list">
          {addresses.map((address) => (
            <div key={address.id} className="address-item">
              {selectable && (
                <input
                  type="radio"
                  name="address"
                  value={address.id}
                  checked={selectedAddressId === address.id}
                  onChange={() => onSelect?.(address.id)}
                />
              )}
              <div className="address-item-content">
                <div className="address-title">
                  <strong>{address.name}</strong>
                  <span>{address.phone}</span>
                  {address.isDefault && <em>默认</em>}
                </div>
                <div className="address-detail">{address.address}</div>
              </div>
              <div className="address-actions">
                {!address.isDefault && (
                  <button type="button" onClick={() => setDefaultAddress(address.id)}>
                    设为默认
                  </button>
                )}
                <button type="button" onClick={() => startEdit(address)}>编辑</button>
                <button type="button" onClick={() => deleteAddress(address.id)}>删除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingId && (
        <form className="address-form" onSubmit={saveAddress}>
          <div className="address-form-grid">
            <label>
              <span>收货人</span>
              <input
                name="name"
                value={form.name}
                onChange={handleFormChange}
                required
              />
            </label>
            <label>
              <span>手机号</span>
              <input
                name="phone"
                value={form.phone}
                onChange={handleFormChange}
                required
              />
            </label>
          </div>
          <label>
            <span>详细地址</span>
            <textarea
              name="address"
              value={form.address}
              onChange={handleFormChange}
              rows="3"
              required
            />
          </label>
          <label className="address-default-row">
            <input
              type="checkbox"
              name="isDefault"
              checked={form.isDefault}
              onChange={handleFormChange}
            />
            设为默认地址
          </label>
          <div className="address-form-actions">
            <button type="submit" className="button button-primary">保存地址</button>
            <button type="button" className="button button-secondary" onClick={cancelEdit}>取消</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AddressManager;
