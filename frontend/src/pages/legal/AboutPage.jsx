import React from 'react';

const teamMembers = [
  { name: '鲁再精', studentId: '22373126', role: '组长 / 项目统筹' },
  { name: '浦灵一', studentId: '24371315', role: '在线下单与支付' },
  { name: '剧博洋', studentId: '24373398', role: '二手商品发布与交易' },
  { name: '王悠然', studentId: '24371186', role: '物流跟踪' },
  { name: '陈子正', studentId: '74216203', role: '信用评价体系' },
  { name: '赵紫嫣', studentId: '24371185', role: '个人店铺管理' }
];

const contactItems = [
  ['项目组别', '第 13 组 NUM1'],
  ['项目题目', '摸鱼'],
  ['组长', '鲁再精（22373126）'],
  ['成员', '浦灵一、剧博洋、王悠然、陈子正、赵紫嫣'],
  ['适用场景', '课程展示、功能演示、项目答辩与后续维护']
];

const AboutPage = () => (
  <main className="legal-page">
    <div className="container">
      <section className="legal-document">
        <div className="legal-header">
          <h1>关于我们</h1>
          <p>第 13 组 NUM1 · “摸鱼”软件工程课程项目</p>
        </div>

        <p>
          我们是第 13 组 NUM1，本项目题目为“摸鱼”。平台面向普通买家、个人卖家和小型商家，
          目标是实现新品购物与二手交易一体化的综合电商体验。
        </p>

        <h2>项目定位</h2>
        <p>
          平台围绕商品搜索与浏览、在线下单与支付、二手商品发布与交易、信用评价体系、个人店铺管理和物流跟踪等功能展开。
          我们希望通过完整的交易流程，让用户可以在“买新”和“淘旧”之间自然切换。
        </p>

        <h2>团队成员</h2>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead>
              <tr>
                <th>姓名</th>
                <th>学号</th>
                <th>主要负责方向</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.studentId}>
                  <td>{member.name}</td>
                  <td>{member.studentId}</td>
                  <td>{member.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2>我们的目标</h2>
        <p>
          本项目重点展示从需求分析、概要设计、详细设计到前后端实现的完整过程。我们会持续完善交易保障、评价信用、
          店铺经营和物流状态展示，让系统更接近真实电商平台的业务闭环。
        </p>

        <h2>联系与反馈</h2>
        <p>
          如果在使用平台过程中遇到账号登录、商品发布、购物车库存、订单支付、物流展示、评价信用或店铺管理等问题，
          可以在课程项目范围内联系第 13 组成员进行反馈。
        </p>

        <div className="contact-list">
          {contactItems.map(([label, value]) => (
            <div className="contact-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <h2>反馈建议</h2>
        <p>
          为了方便定位问题，反馈时建议说明具体页面、操作步骤、出现的问题现象，以及是否涉及测试账号、商品名称或订单编号。
          本平台当前重点用于课堂展示和功能验证；若后续作为真实业务系统上线，还需要补充正式客服渠道、工单系统、
          数据合规审查和运营审核流程。
        </p>
      </section>
    </div>
  </main>
);

export default AboutPage;
