const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { DataTypes, Op } = require('sequelize');
const { createService } = require('../common/createService');
const { createDatabase, initializeDatabase } = require('../common/database');
const { decodeToken, getJwtSecret, requireInternalToken } = require('../common/auth');
const { validateProductionSecrets } = require('../common/security');

validateProductionSecrets();

const serviceName = process.env.SERVICE_NAME || 'user-service';
const version = process.env.SERVICE_VERSION || '2.0.0';
const sequelize = createDatabase('softw_users');
let databaseReady = false;

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  avatar: { type: DataTypes.STRING, defaultValue: '' },
  nickname: { type: DataTypes.STRING, defaultValue: '' },
  gender: { type: DataTypes.ENUM('male', 'female', 'other'), defaultValue: 'other' },
  birthday: { type: DataTypes.DATE },
  creditScore: { type: DataTypes.INTEGER, defaultValue: 100 },
  creditLevel: { type: DataTypes.STRING, defaultValue: '普通' },
  role: { type: DataTypes.ENUM('user', 'seller', 'admin'), defaultValue: 'user' }
});

const Address = sequelize.define('Address', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: false },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  indexes: [{ name: 'idx_addresses_user_default_updated', fields: ['userId', 'isDefault', 'updatedAt'] }]
});

User.hasMany(Address, { foreignKey: 'userId', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'userId' });
User.beforeCreate(async user => { user.password = await bcrypt.hash(user.password, 10); });
User.beforeUpdate(async user => {
  if (user.changed('password')) user.password = await bcrypt.hash(user.password, 10);
});

const safeUser = (user) => {
  const data = user.toJSON ? user.toJSON() : { ...user };
  delete data.password;
  return data;
};
const creditLevel = score => score >= 140 ? '钻石' : score >= 120 ? '金牌' : score >= 100 ? '良好' : score >= 80 ? '普通' : '受限';

const requireUser = async (req, res, next) => {
  try {
    const decoded = decodeToken(req);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: '用户不存在或登录已失效' });
    req.user = user;
    return next();
  } catch (error) {
    return res.status(error.status || 401).json({ message: error.message });
  }
};

const router = express.Router();

router.post('/api/users/register', async (req, res, next) => {
  const { username, password, phone, email } = req.body;
  if (!String(username || '').trim()) return res.status(400).json({ message: '用户名不能为空' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''))) return res.status(400).json({ message: '邮箱格式不正确' });
  if (!String(phone || '').trim()) return res.status(400).json({ message: '手机号不能为空' });
  if (String(password || '').length < 6) return res.status(400).json({ message: '密码长度不能少于6位' });
  try {
    const exists = await User.findOne({ where: { [Op.or]: [{ username }, { email }] } });
    if (exists) return res.status(400).json({ message: '用户已存在' });
    const user = await User.create({ username, password, phone, email });
    return res.status(201).json({ ...safeUser(user), _id: user.id, token: jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }) });
  } catch (error) { return next(error); }
});

router.post('/api/users/login', async (req, res, next) => {
  try {
    const user = await User.findOne({ where: { email: req.body.email } });
    if (!user) return res.status(401).json({ message: '用户不存在' });
    if (!await bcrypt.compare(String(req.body.password || ''), user.password)) return res.status(401).json({ message: '密码错误' });
    return res.json({ ...safeUser(user), _id: user.id, token: jwt.sign({ id: user.id }, getJwtSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }) });
  } catch (error) { return next(error); }
});

router.get('/api/users/profile', requireUser, (req, res) => res.json(safeUser(req.user)));
router.put('/api/users/profile', requireUser, async (req, res, next) => {
  try {
    const allowed = ['nickname', 'avatar', 'gender', 'birthday', 'phone', 'email'];
    const updates = {};
    for (const field of allowed) if (req.body[field] !== undefined) updates[field] = req.body[field];
    if (updates.email && updates.email !== req.user.email) {
      const exists = await User.findOne({ where: { email: updates.email, id: { [Op.ne]: req.user.id } } });
      if (exists) return res.status(400).json({ message: '邮箱已被使用' });
    }
    await req.user.update(updates);
    return res.json(safeUser(req.user));
  } catch (error) { return next(error); }
});
router.put('/api/users/password', requireUser, async (req, res, next) => {
  try {
    if (!await bcrypt.compare(String(req.body.oldPassword || ''), req.user.password)) return res.status(401).json({ message: '旧密码错误' });
    if (String(req.body.newPassword || '').length < 6) return res.status(400).json({ message: '新密码长度不能少于6位' });
    await req.user.update({ password: req.body.newPassword });
    return res.json({ message: '密码修改成功' });
  } catch (error) { return next(error); }
});

router.get('/api/addresses', requireUser, async (req, res, next) => {
  try {
    const rows = await Address.findAll({ where: { userId: req.user.id }, order: [['isDefault', 'DESC'], ['updatedAt', 'DESC']] });
    return res.json(rows.map(row => ({ ...row.toJSON(), id: String(row.id), isDefault: Boolean(row.isDefault) })));
  } catch (error) { return next(error); }
});
router.put('/api/addresses', requireUser, async (req, res, next) => {
  const input = Array.isArray(req.body.addresses) ? req.body.addresses : req.body;
  if (!Array.isArray(input)) return res.status(400).json({ message: '地址数据格式错误' });
  const transaction = await sequelize.transaction();
  try {
    const rows = input.map((item, index) => ({
      id: String(item.id || `${req.user.id}-${Date.now()}-${index}`), userId: req.user.id,
      name: String(item.name || '').trim(), phone: String(item.phone || '').trim(),
      address: String(item.address || '').trim(), isDefault: Boolean(item.isDefault)
    })).filter(item => item.name && item.phone && item.address);
    if (rows.length && !rows.some(item => item.isDefault)) rows[0].isDefault = true;
    const firstDefault = rows.findIndex(item => item.isDefault);
    rows.forEach((item, index) => { item.isDefault = index === firstDefault; });
    await Address.destroy({ where: { userId: req.user.id }, transaction });
    if (rows.length) await Address.bulkCreate(rows, { transaction });
    await transaction.commit();
    return res.json(rows);
  } catch (error) { await transaction.rollback(); return next(error); }
});

router.get('/internal/users/:id', requireInternalToken, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  return user ? res.json(safeUser(user)) : res.status(404).json({ message: '用户不存在' });
});
router.post('/internal/users/:id/credit', requireInternalToken, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  const score = Math.max(0, Number(user.creditScore) + Number(req.body.delta || 0));
  await user.update({ creditScore: score, creditLevel: creditLevel(score) });
  return res.json(safeUser(user));
});
router.post('/internal/users/:id/role', requireInternalToken, async (req, res) => {
  const user = await User.findByPk(req.params.id);
  if (!user) return res.status(404).json({ message: '用户不存在' });
  if (!['user', 'seller', 'admin'].includes(req.body.role)) return res.status(400).json({ message: '角色不合法' });
  await user.update({ role: req.body.role });
  return res.json(safeUser(user));
});

const checkDatabaseReady = async () => {
  if (!databaseReady) return false;
  await sequelize.authenticate();
  return true;
};
const app = createService({ express, name: serviceName, version, isReady: checkDatabaseReady, routes: instance => instance.use(router) });
async function initialize() { await initializeDatabase(sequelize); databaseReady = true; }
if (require.main === module) initialize().then(() => app.listen(Number(process.env.PORT || 3101), () => console.log(`${serviceName} listening`))).catch(error => { console.error(error); process.exit(1); });

module.exports = { app, initialize, sequelize, models: { User, Address } };
