const tool = {
    msg: (title, sub, body) => $notification.post(title, sub, String(body)),
    done: (obj) => $done(obj)
};

// 1. 绝对防御：放行预检、无请求体、非 200 状态码的请求
if ($request.method === 'OPTIONS' || !$response || !$response.body || $response.status != 200) {
    tool.done({}); // 什么都不改，直接放行
    return;        // 必须 return 阻断
}

const url = $request.url;

try {
    if (url.includes("/api/rights/activity/secKill/info")) {
        
        let bodyStr = $response.body;
        // Loon 兼容：如果遇到诡异的非字符串 body，转成字符串
        if (typeof bodyStr !== 'string') {
            bodyStr = JSON.stringify(bodyStr);
        }

        let obj = JSON.parse(bodyStr);
        let data = obj.data || {};
        let srvTime = data.currentTime || Math.floor(Date.now() / 1000);

        // 核心修改逻辑：无差别遍历，防止 JSON 路径变动导致找不到数据
        let modifiedCount = 0;
        function hackCoupon(node) {
            if (!node || typeof node !== 'object') return;
            
            // 只要发现带有 couponId 或 rightCode 的对象，统统改掉
            if (node.couponId || node.rightCode || node.couponName) {
                node.status = 2; 
                node.couponStatus = 1;
                node.couponStartTime = srvTime - 1; 
                node.residueStock = node.totalStock || 4000; 
                if (node.stockStatus !== undefined) node.stockStatus = 1;
                modifiedCount++;
            }

            Object.keys(node).forEach(key => {
                if (typeof node[key] === 'object') hackCoupon(node[key]);
            });
        }

        hackCoupon(data);

        // 时间漫游
        if (data.currentTime) {
            data.currentTime = srvTime + 1;
        }

        // 成功时弹窗提示（如果你嫌烦，以后可以注释掉这行）
        tool.msg("✅ 美团查券成功", `成功修改了 ${modifiedCount} 张券`, "按钮应已点亮");
        
        // 返回修改后的 Body
        tool.done({ body: JSON.stringify(obj) });
        return; // 结束

    } else if (url.includes("/playcenter/common/v1/doaction")) {
        // 老虎机逻辑... (略作精简，防止主干卡死)
        let obj = JSON.parse($response.body);
        if (obj.data && obj.data.chanceLimit) {
            obj.data.chanceLimit.todayPartTime = 0;
            obj.data.chanceLimit.todayAvailableTime = 111;
        }
        tool.done({ body: JSON.stringify(obj) });
        return;
    } else {
        tool.done({});
        return;
    }

} catch (e) {
    // 🚨 终极防挂起与报错机制！
    // 1. 把报错信息直接弹到屏幕上
    tool.msg("❌ 美团脚本崩溃", "错误信息:", e.message || e);
    
    // 2. 最关键的一步：即使报错，也要把【原始的 body】原封不动还给 Loon！
    // 这样前端只会显示原版页面，绝对不会发生 Pending 或白屏卡死！
    tool.done({ body: $response.body });
}
