const tool = {
    log: (msg) => console.log(`[美团抢券] ${msg}`),
    msg: (title, sub, body) => $notification.post(title, sub, body),
    done: (obj = {}) => $done(obj)
};

if (typeof $response === "undefined" || !$response.body) {
    tool.done();
}

const url = $request.url;
const secKillPath = "/api/rights/activity/secKill/info";
const doActionPath = "/playcenter/common/v1/doaction";

try {
    if (url.includes(secKillPath)) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};
        const allRounds = data.allGrabRounds || [];
        
        let currentRoundCode = data.currentGrabCouponInfo?.roundCode;
        let serverTimeSec = data.currentTime || Math.floor(Date.now() / 1000);
        const now = new Date(serverTimeSec * 1000);
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const ymd = `${y}/${m}/${d}`;
        const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

        let targetRound = null;
        if (allRounds.length > 0) {
            if (currentRoundCode && currentRoundCode !== "undefined") {
                targetRound = allRounds.find(r => r.roundCode == currentRoundCode);
            }
            if (!targetRound) {
                targetRound = allRounds.find(r => currentTimeStr >= r.startTime && currentTimeStr <= r.endTime) 
                              || allRounds.find(r => r.startTime > currentTimeStr)
                              || allRounds[0]; 
            }
        }

        let targetTs = serverTimeSec * 1000;
        if (targetRound && targetRound.startTime) {
            const fullStartStr = `${ymd} ${targetRound.startTime}`;
            targetTs = new Date(fullStartStr).getTime();
        }

        const tsSec = Math.floor(targetTs / 1000);
        data.currentTime = tsSec;
        
        const coupons = data.currentGrabCouponInfo?.coupon || [];
        coupons.forEach(c => {
            c.couponStartTime = tsSec;
            c.status = 2; 
            if (c.residueStock === 0) c.residueStock = c.totalStock || 4000;
        });

        let infoList = [];
        coupons.forEach(c => {
            const name = c.couponName || "未知券";
            const amount = c.couponAmount || "-";
            const limit = c.couponAmountLimit || "-";
            const residue = c.residueStock ?? 0;
            const total = c.totalStock ?? 0;
            infoList.push(`${name}: 满${limit}减${amount} [存:${residue}/${total}]`);
        });

        const displayTime = new Date(targetTs).toLocaleTimeString('zh-CN', { hour12: false });
        let subTitle = `穿越成功至: ${displayTime}`;
        if (targetRound) subTitle += ` | 场次: ${targetRound.startTime}`;
        
        const msgBody = infoList.length > 0 ? infoList.join("\n") : "无券可展示";
        tool.msg("美团查券助手", subTitle, msgBody);
        tool.log(`[修正] 目标时间: ${displayTime}, 戳: ${tsSec}`);

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

        tool.msg("美团老虎机", obj.msg || "动作执行完成", prizeMsg);
        tool.done({ body: JSON.stringify(obj) });

    } else {
        tool.done({});
    }
} catch (e) {
    tool.log(`脚本错误: ${e}`);
    tool.done({});
}
