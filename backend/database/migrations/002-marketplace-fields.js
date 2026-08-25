const ensureSchema = require('../../utils/ensureSchema');

module.exports = {
  version: '002-marketplace-fields',

  async up({ sequelize }) {
    await ensureSchema(sequelize);
  },

  async down({ sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const productTable = await queryInterface.describeTable('Products');
    const shopTable = await queryInterface.describeTable('Shops');

    if (productTable.bargainEnabled) {
      await queryInterface.removeColumn('Products', 'bargainEnabled');
    }

    for (const column of [
      'verificationStatus',
      'legalName',
      'idNumber',
      'verificationAddress',
      'businessLicenseImage',
      'idCardImage',
      'verificationSubmittedAt'
    ]) {
      if (shopTable[column]) {
        await queryInterface.removeColumn('Shops', column);
      }
    }
  }
};
