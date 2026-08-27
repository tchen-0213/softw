const { DataTypes } = require('sequelize');

module.exports = {
  version: '003-bargain-redemption',

  async up({ sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('ChatMessages');

    if (!table.redeemedAt) {
      await queryInterface.addColumn('ChatMessages', 'redeemedAt', {
        type: DataTypes.DATE,
        allowNull: true
      });
    }
  },

  async down({ sequelize }) {
    const queryInterface = sequelize.getQueryInterface();
    const table = await queryInterface.describeTable('ChatMessages');

    if (table.redeemedAt) {
      await queryInterface.removeColumn('ChatMessages', 'redeemedAt');
    }
  }
};
