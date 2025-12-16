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
        const currentRoundCode = data.currentGrabCouponInfo?.roundCode;
        
        let targetTs = new Date().getTime();
        
        if (allRounds.length > 0) {
            let targetRound = null;
            
            if (currentRoundCode) {
                targetRound = allRounds.find(r => r.roundCode == currentRoundCode);
            }
            
            if (!targetRound) {
                targetRound = allRounds[0];
            }

            if (targetRound && targetRound.startTime) {
                if (typeof targetRound.startTime === 'number') {
                    targetTs = targetRound.startTime;
                } else {
                    let timeStr = String(targetRound.startTime).replace(/-/g, '/');
                    if (!timeStr.includes('/') && timeStr.includes(':')) {
                        const now = new Date();
                        const utc8Offset = 8 * 60;
                        const localOffset = now.getTimezoneOffset();
                        const beijingNow = new Date(now.getTime() + (localOffset + utc8Offset) * 60 * 1000);
                        
                        const y = beijingNow.getFullYear();
                        const m = String(beijingNow.getMonth() + 1).padStart(2, "0");
                        const d = String(beijingNow.getDate()).padStart(2, "0");
                        timeStr = `${y}/${m}/${d} ${timeStr}`;
                    }
                    targetTs = new Date(timeStr).getTime();
                }
            }
        }

        const tsSec = Math.floor(targetTs / 1000);
        data.currentTime = tsSec;
        
        const coupons = data.currentGrabCouponInfo?.coupon || [];
        
        coupons.forEach(c => c.couponStartTime = tsSec);

        let infoList = [];
        coupons.forEach(c => {
            const total = c.totalStock ?? 0;
            const residue = c.residueStock ?? 0;
            if (total === 0 && residue === 0) return;
            
            if ([4, 8].includes(c.status)) {
                c.status = 2; 
                if (c.status === 4 && !c.residueStock) c.residueStock = c.totalStock || 1;
            }

            const name = c.couponName || "未知券";
            const limit = c.couponAmountLimit || "-";
            const amount = c.couponAmount || "-";
            infoList.push(`${name}: ${limit}-${amount} [${residue}/${total}]`);
        });

        let roundStartStr = "";
        if (currentRoundCode) {
            const roundInfo = allRounds.find(r => r.roundCode === currentRoundCode);
            if (roundInfo?.startTime) roundStartStr = roundInfo.startTime;
        }

        const targetDateObj = new Date(targetTs);
        const h = String(targetDateObj.getHours()).padStart(2, "0");
        const min = String(targetDateObj.getMinutes()).padStart(2, "0");
        const s = String(targetDateObj.getSeconds()).padStart(2, "0");
        const displayTime = `${h}:${min}:${s}`;

        let subTitle = `穿越至: ${displayTime}`;
        if (roundStartStr) subTitle += ` | 场次: ${roundStartStr}`;
        
        const msgBody = infoList.length > 0 ? infoList.join("\n") : "当前场次暂无可展示券";
        tool.msg("美团查券", subTitle, msgBody);
        tool.log(`穿越成功 -> ${targetTs} (ts:${tsSec})`);

        tool.done({ body: JSON.stringify(obj) });
    } else if (url.includes("playcenter") && url.includes("doaction")) {
        const obj = JSON.parse($response.body);
        const data = obj.data || {};
        const chance = data.chanceLimit || {};

        const partTime = chance.todayPartTime ?? 0;
        const perDay = chance.perDayLimitForUser ?? 0;
        
        chance.todayPartTime = 0;
        chance.todayAvailableTime = 111;

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

    } else {
        tool.done({});
    }
} catch (e) {
    tool.log(`脚本执行异常: ${e}`);
    tool.done({});
}
