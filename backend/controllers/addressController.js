const Address = require('../models/Address');

const normalizeAddress = (address) => ({
  id: String(address.id),
  name: address.name,
  phone: address.phone,
  address: address.address,
  isDefault: Boolean(address.isDefault)
});

const normalizeInput = (address, index, userId) => ({
  id: String(address.id || `${userId}-${Date.now()}-${index}`),
  userId,
  name: String(address.name || '').trim(),
  phone: String(address.phone || '').trim(),
  address: String(address.address || '').trim(),
  isDefault: Boolean(address.isDefault)
});

exports.getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id },
      order: [
        ['isDefault', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    });

    res.json(addresses.map(normalizeAddress));
  } catch (error) {
    res.status(500).json({ message: '获取地址失败', error: error.message });
  }
};

exports.replaceAddresses = async (req, res) => {
  const addresses = Array.isArray(req.body.addresses) ? req.body.addresses : req.body;
  if (!Array.isArray(addresses)) {
    return res.status(400).json({ message: '地址数据格式错误' });
  }

  try {
    const nextAddresses = addresses
      .map((address, index) => normalizeInput(address, index, req.user.id))
      .filter(address => address.name && address.phone && address.address);

    if (nextAddresses.length > 0 && !nextAddresses.some(address => address.isDefault)) {
      nextAddresses[0].isDefault = true;
    }

    const defaultIndex = nextAddresses.findIndex(address => address.isDefault);
    if (defaultIndex >= 0) {
      nextAddresses.forEach((address, index) => {
        address.isDefault = index === defaultIndex;
      });
    }

    await Address.destroy({ where: { userId: req.user.id } });
    if (nextAddresses.length > 0) {
      await Address.bulkCreate(nextAddresses);
    }

    const saved = await Address.findAll({
      where: { userId: req.user.id },
      order: [
        ['isDefault', 'DESC'],
        ['updatedAt', 'DESC']
      ]
    });

    res.json(saved.map(normalizeAddress));
  } catch (error) {
    res.status(500).json({ message: '保存地址失败', error: error.message });
  }
};
