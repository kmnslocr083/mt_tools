const tool = {
    log: (msg) => console.log(`[美团抢券] ${msg}`),
    msg: (title, sub, body) => $notification.post(title, sub, body),
    done: (obj = {}) => $done(obj)
};

if (typeof $response === "undefined") {
    tool.log("错误：未获取到 $response");
    tool.done();
} else if (!$response.body) {
    tool.log("错误：Body 为空，状态码: " + $response.status);
    tool.done();
}

const url = $request.url;
const secKillPath = "/api/rights/activity/secKill/info";
const doActionPath = "/playcenter/common/v1/doaction";

try {
    if (url.includes(secKillPath)) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};
        
        let targetTsSec = data.currentTime || Math.floor(Date.now() / 1000);
        if (data.currentGrabCouponInfo && data.currentGrabCouponInfo.startDate) {
            targetTsSec = data.currentGrabCouponInfo.startDate;
        } else if (data.allGrabRounds && data.allGrabRounds.length > 0) {
            const currentRoundCode = data.currentGrabCouponInfo?.roundCode;
            let targetRound = data.allGrabRounds.find(r => r.roundCode == currentRoundCode) || data.allGrabRounds[0];
            if (targetRound && targetRound.startTime) {
                const now = new Date(targetTsSec * 1000);
                const ymd = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`;
                targetTsSec = Math.floor(new Date(`${ymd} ${targetRound.startTime}`).getTime() / 1000);
            }
        }

        const coupons = data.currentGrabCouponInfo?.coupon || [];
        coupons.forEach(c => {
            c.couponStartTime = targetTsSec;
            c.status = 2;
            c.couponStatus = 1;
            
            if (!c.residueStock || c.residueStock <= 0) {
                c.residueStock = c.totalStock || 4000;
            }
        });

        if (data.currentTime < targetTsSec) {
            data.currentTime = targetTsSec + 1;
        }

        let infoList = [];
        coupons.forEach(c => {
            const name = c.couponName || "神券";
            const amount = c.couponAmount || "-";
            const limit = c.couponAmountLimit || "-";
            infoList.push(`${name}: 满${limit}减${amount} [存:${c.residueStock}/${c.totalStock}]`);
        });

        const displayTime = new Date(targetTsSec * 1000).toLocaleTimeString('zh-CN', { hour12: false });
        const subTitle = (data.currentTime < targetTsSec) ? `穿越成功至: ${displayTime}` : `当前场次: ${displayTime} (已就绪)`;
        
        tool.msg("美团查券助手", subTitle, infoList.length > 0 ? infoList.join("\n") : "无可用券");
        tool.log(`[修正完成] 目标时间戳: ${targetTsSec}, 当前模拟时间: ${data.currentTime}`);

        tool.done({ body: JSON.stringify(obj) });

    } else if (url.includes("playcenter") && url.includes("doaction")) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};
        if (data.chanceLimit) {
            data.chanceLimit.todayPartTime = 0;
            data.chanceLimit.todayAvailableTime = 111;
        }

        let prizeMsg = "点击查看详情";
        const prizeList = data.prizeInfoList || [];
        if (prizeList.length > 0 && prizeList[0].couponInfo) {
            const c = prizeList[0].couponInfo;
            prizeMsg = `获得: ${c.couponTitle || '优惠券'} 满${c.priceLimit || 0}减${c.couponValue || 0}`;
        }

        tool.msg("美团老虎机", obj.msg || "执行完毕", prizeMsg);
        tool.done({ body: JSON.stringify(obj) });
    } else {
        tool.done({});
    }
} catch (e) {
    tool.log(`脚本错误: ${e}`);
    tool.done({});
}
