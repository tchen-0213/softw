const { DataTypes } = require('sequelize');

const addColumnIfMissing = async (queryInterface, tableName, columnName, definition) => {
  const table = await queryInterface.describeTable(tableName);
  if (!table[columnName]) {
    await queryInterface.addColumn(tableName, columnName, definition);
  }
};

const ensureSchema = async (sequelize) => {
  const queryInterface = sequelize.getQueryInterface();

  await addColumnIfMissing(queryInterface, 'Products', 'bargainEnabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  });
  await sequelize.query(`
    UPDATE Products
    SET bargainEnabled = true
    WHERE bargainEnabled IS NULL
  `);

  await addColumnIfMissing(queryInterface, 'Shops', 'verificationStatus', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '未认证'
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'legalName', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'idNumber', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'verificationAddress', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'businessLicenseImage', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'idCardImage', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: ''
  });
  await addColumnIfMissing(queryInterface, 'Shops', 'verificationSubmittedAt', {
    type: DataTypes.DATE,
    allowNull: true
  });
};

module.exports = ensureSchema;
