const tool = {
    log: (msg) => console.log(`[美团抢券] ${msg}`),
    msg: (title, sub, body) => {
        if (typeof $notification !== "undefined") {
            $notification.post(title, sub, body);
        } else if (typeof $notify !== "undefined") {
            $notify(title, sub, body);
        }
    },
    done: (obj = {}) => $done(obj)
};

if (typeof $response === "undefined" || !$response.body) {
    tool.done();
    return;
}

const url = $request.url;
const secKillPath = "/api/rights/activity/secKill/info";
const doActionPath = "/playcenter/common/v1/doaction";

try {
    if (url.includes(secKillPath)) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};

        const coupons = data.currentGrabCouponInfo?.coupon || [];
        let infoList = [];

        coupons.forEach(c => {
            const total = c.totalStock ?? 0;
            const residue = c.residueStock ?? 0;
            if (total === 0 && residue === 0) return;
            
            // 劫持修改抢券状态
            if ([4, 8].includes(c.status)) {
                c.status = 2; 
                if (c.status === 4 && !c.residueStock) {
                    c.residueStock = c.totalStock || 1;
                }
            }

            const name = c.couponName || "未知券";
            const limit = c.couponAmountLimit || "-";
            const amount = c.couponAmount || "-";
            infoList.push(`${name}: ${limit}-${amount} [${residue}/${total}]`);
        });

        const msgBody = infoList.length > 0 ? infoList.join("\n") : "当前场次暂无可展示券";
        tool.msg("美团查券", "券状态解析成功", msgBody);

        tool.done({ body: JSON.stringify(obj) });

    } else if (url.includes(doActionPath)) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};
        const chance = data.chanceLimit || {};

        const partTime = chance.todayPartTime ?? 0;
        const perDay = chance.perDayLimitForUser ?? 0;
        
        let prizeMsg = "";
        const prizeList = data.prizeInfoList || [];
        if (prizeList.length > 0) {
            const coupon = prizeList[0].couponInfo;
            if (coupon) {
                const title = coupon.couponTitle || coupon.couponName || "";
                const val = coupon.couponValue || "";
                const limit = coupon.priceLimit || "";
                prizeMsg = `获得: ${title} ${limit}-${val}`;
            }
        }

        const serverMsg = obj.msg || "无消息";
        const countInfo = `[${partTime}/${perDay}]`;
        
        tool.msg("美团老虎鸡", `${countInfo} ${serverMsg}`, prizeMsg);
        
        tool.done({ body: JSON.stringify(obj) });

    } else if (url.includes("market.waimai.meituan.com/gundam/") && url.includes("/index.html")) {
        const baseUrl = url.split("?")[0];
        
        tool.log(`活动链接: ${baseUrl}`);
        tool.msg("美团活动链接", "成功", baseUrl);
        
        tool.done({});
    } else {
        tool.done({});
    }
} catch (e) {
    tool.log(`脚本执行异常: ${e}`);
    // 即使出错，也保证将原始请求放行，不影响日常使用
    tool.done({});
}
