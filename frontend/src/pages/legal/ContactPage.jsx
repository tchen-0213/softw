import React from 'react';

const contacts = [
  ['项目组别', '第 13 组 NUM1'],
  ['项目题目', '购物与二手交易平台'],
  ['组长', '鲁再精（22373126）'],
  ['成员', '浦灵一、剧博洋、王悠然、陈子正、赵紫嫣'],
  ['适用场景', '课程展示、功能演示、项目答辩与后续维护']
];

const ContactPage = () => (
  <main className="legal-page">
    <div className="container">
      <section className="legal-document">
        <div className="legal-header">
          <h1>联系我们</h1>
          <p>第 13 组 NUM1 · 项目联系信息</p>
        </div>

        <p>
          如果在使用平台过程中遇到账号登录、商品发布、购物车库存、订单支付、物流展示、评价信用或店铺管理等问题，
          可以在课程项目范围内联系第 13 组成员进行反馈。
        </p>

        <h2>联系信息</h2>
        <div className="contact-list">
          {contacts.map(([label, value]) => (
            <div className="contact-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <h2>反馈建议</h2>
        <p>
          为了方便定位问题，反馈时建议说明具体页面、操作步骤、出现的问题现象，以及是否涉及测试账号、商品名称或订单编号。
          例如：“在商品详情页连续点击加入购物车后，库存提示是否正常显示”。
        </p>

        <h2>维护说明</h2>
        <p>
          本平台为软件工程课程项目，当前重点用于课堂展示和功能验证。若后续作为真实业务系统上线，需要进一步补充正式客服渠道、
          工单系统、数据合规审查和运营审核流程。
        </p>
      </section>
    </div>
  </main>
);

export default ContactPage;
