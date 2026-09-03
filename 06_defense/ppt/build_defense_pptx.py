#!/usr/bin/env python3
"""7-page content draft only. Layout/theme is for Image 2, not this script."""
from pathlib import Path

from pptx import Presentation
from pptx.util import Inches, Pt

ROOT = Path(__file__).resolve().parents[2]
PPTX = ROOT / "06_defense" / "13组-摸鱼-最终答辩.pptx"


def _set_run(run, size=18, bold=False):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.name = "Microsoft YaHei"


def add_bullets(tf, lines, size=18):
    tf.clear()
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.level = 0
        run = p.add_run()
        run.text = line
        _set_run(run, size=size)


def add_title_body(prs, title, lines, size=18):
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = title
    for p in slide.shapes.title.text_frame.paragraphs:
        for r in p.runs:
            _set_run(r, size=28, bold=True)
    body = slide.placeholders[1].text_frame
    add_bullets(body, lines, size=size)
    return slide


def main():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    s = prs.slides.add_slide(prs.slide_layouts[0])
    s.shapes.title.text = "摸鱼 · 校园购物 + 二手交易平台"
    sub = s.placeholders[1].text_frame
    add_bullets(
        sub,
        [
            "软件工程基础实践 2026 夏  ·  杨任宇老师班 13组",
            "https://github.com/tchen-0213/softw",
            "鲁在精  浦灵一  王悠然  赵紫嫣  陈子正  剧博洋",
            "本页起约 3 分钟讲项目与架构；现场演示播放录屏",
        ],
        size=20,
    )

    add_title_body(
        prs,
        "项目目标与全部业务场景（UC01–UC12 均完成）",
        [
            "校园购物+二手。原系统 React + 一个 Express + MySQL shopping_platform；标签 monolith-start（10fa639）",
            "小学期：Docker 三容器、GitHub Actions、K8s YAML、三业务微服务+网关；标签 microservices-v1（63585e0）",
            "端口：单体 8080/3001；微服务前端 8082、网关 8081",
            "UC01 注册登录（重点）  UC02 搜索（重点）  UC03 详情加购  UC04 下单履约（重点）",
            "UC05 二手  UC06 店铺  UC07 评价  UC08 议价  UC09 地址  UC10 物流  UC11 取消恢复库存  UC12 公开店铺",
            "重点三条不等于只做了三条；UC10–UC12 终期纳入追溯",
        ],
        size=18,
    )

    add_title_body(
        prs,
        "代表用例：需求—设计—代码—测试（模型到代码）",
        [
            "UC01 SYS/COMP/OBJ-SEQ01 → user.js userController AuthPage → UNIT/INT/E2E-TC01",
            "UC02 SYS/COMP/OBJ-SEQ02 → product.js productController SearchPage → UNIT/INT/E2E-TC02",
            "UC04 SYS/COMP/OBJ-SEQ04 → order.js orderController CheckoutPage → UNIT/INT/E2E-TC04",
            "UC04：需求下单支付发货收货 → 组件级页面/鉴权/控制器/事务 → 对象级 createOrder()、pay/ship/confirm",
            "状态 待付款→待发货→待收货→已完成；order-service 按 reservationId 调 product-service 预留/释放/完成",
            "系统级不出现 Controller；对象级到函数名。图用仓库 PNG 原图，不要重绘",
        ],
        size=17,
    )

    add_title_body(
        prs,
        "三个业务微服务：职责、划分、接口、表、失败处理",
        [
            "前端→API Gateway（不算业务服务）→ user / product / order；按身份/标的/交易过程拆，不是 12 个服务",
            "user-service → softw_users（Users, Addresses）  注册登录资料密码地址角色信用",
            "product-service → softw_catalog + uploads  商品二手店铺评价聊天议价图片库存",
            "order-service → softw_orders（Orders）  下单支付取消发货收货；订单存快照，不跨库联表",
            "网关：/api/users,/api/addresses→user；商品/二手/店/评价/聊天/上传→product；/api/orders→order",
            "失败：网关超时 503 不伪造；预留失败不下单；幂等 reservationId；停商品服务：商品 503、订单 206，其它仍存活",
        ],
        size=16,
    )

    add_title_body(
        prs,
        "关键数据（2026-09-03 二阶段；性能 2026-08-28）",
        [
            "后端 220 通过/0 失败/1 跳过（含 REG-BE 100/100）；前端原有 100/100，REG-FE 待 Vitest 复跑",
            "覆盖率 94.42%/81.83%/92.34%/94.42%；API 32/32；E2E 两侧 42/42；微服务 18/18、22/22、15/15；49 项公开 API",
            "CI softw-ci-cd：先测后 7 镜像+Kind；测失败不发版；绿勾 Actions #77（33579985248）",
            "列表吞吐 +61.9%、延迟 −38.6%、CPU +55.2%（搜索/详情见文案表）。禁止写「微服务天然更快」",
            "HPA 1→3→5→1（不放进 CI/CD）；停 product-service：503 / 206，恢复无残留",
        ],
        size=16,
    )

    add_title_body(
        prs,
        "分工与大模型",
        [
            "鲁在精 组长/计划协调汇报；浦灵一 后端安全文档；王悠然 前端；赵紫嫣 测试；陈子正 流水线部署；剧博洋 性能",
            "权重待全组确认，不按 commit 换算。GitHub Issues + Project「软工小学期」+ Actions",
            "大模型：检索、测试建议、文档整理、部署检查。人工读代码、真跑测试、对版本、扫凭据。输出不当验收结论",
        ],
        size=18,
    )

    add_title_body(
        prs,
        "接下来播放演示录屏",
        [
            "现场 4 分钟以录屏为主（可加速；最好配音字幕）",
            "录屏中应能看到：① 提交并触发流水线（#77；失败不进镜像）② kubectl/Pod 网关+三服务",
            "③ UC01→UC02→UC04 及自动化测试 ④ HPA 1→3→5→1（不在 CI/CD）⑤ 停商品服务 503/206，其它仍可用",
        ],
        size=20,
    )

    PPTX.parent.mkdir(parents=True, exist_ok=True)
    prs.save(PPTX)
    print(PPTX)


if __name__ == "__main__":
    main()
