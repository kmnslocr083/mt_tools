const method = $request.method || "未知方法";
$notification.post("🚨 滴滴滴！脚本触发成功", "拦截到了请求:", method);
$done({}); // 收到请求直接放行，不做任何修改
