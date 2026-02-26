const tool = {
    log: (msg) => console.log(`[美团神券终结版] ${msg}`),
    msg: (t, s, b) => $notification.post(t, s, b),
    done: (obj = {}) => $done(obj)
};

if (typeof $response === "undefined" || !$response.body) tool.done();

let body = $response.body;
let url = $request.url;

try {
    let obj = JSON.parse(body);
    
    let data = obj.data || {};
    let srvTime = data.currentTime || Math.floor(Date.now() / 1000);
    function hackCoupons(node) {
        if (!node || typeof node !== 'object') return;

        if (node.couponId || node.rightCode || node.couponName) {
            node.status = 2;
            node.couponStatus = 1;
            node.couponStartTime = srvTime - 1;
            node.residueStock = node.totalStock || 4000;
            if (node.stockStatus !== undefined) node.stockStatus = 1;
        }

        for (let key in node) {
            if (typeof node[key] === 'object') hackCoupons(node[key]);
        }
    }

    hackCoupons(data);

    if (data.currentTime) {
        data.currentTime = srvTime + 1;
    }

    if (url.includes("roundCode=undefined") && data.allGrabRounds) {
        if (!data.currentGrabCouponInfo && data.allGrabRounds.length > 0) {
            tool.log("检测到 roundCode 缺失，尝试自动对齐场次");
        }
    }

    tool.log(`成功处理数据。模拟服务器时间: ${data.currentTime}`);
    tool.done({ body: JSON.stringify(obj) });

} catch (e) {
    tool.log(`解析失败! 可能原因: Body 不完整或格式变动。错误信息: ${e}`);
    tool.done({});
}
