module.exports = {
  version: '001-baseline-schema',

  async up({ sequelize }) {
    await sequelize.sync();
  },

  async down({ sequelize }) {
    await sequelize.drop();
  }
};
