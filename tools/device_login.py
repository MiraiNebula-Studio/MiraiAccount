#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OAuth2 设备授权流演练（RFC 8628，模拟设备端/依赖方）。

申请 device_code/user_code 后自动打开浏览器的设备授权页，用户在已登录
会话确认授权，脚本按 interval 轮询 token 端点直至取得令牌。仅依赖 Python
标准库。错误语义（authorization_pending/slow_down/expired_token/access_denied）
由业务接口的 msg 字段承载，与授权服务器约定一致。

用法：
  python tools/device_login.py --base http://localhost:3000 --client-id 1
  python tools/device_login.py --base http://localhost:3000 --client-id 1 --scope "openid profile email" --save token.json
"""
import argparse
import base64
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

GRANT_TYPE = "urn:ietf:params:oauth:grant-type:device_code"


def request(url, method="GET", json_body=None, bearer=None):
    req = urllib.request.Request(url, data=json.dumps(json_body).encode()
                                 if json_body is not None else None, method=method)
    if json_body is not None:
        req.add_header("Content-Type", "application/json")
    if bearer:
        req.add_header("Authorization", "Bearer " + bearer)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        code = e.code
        try:
            return code, json.loads(raw or "null")
        except ValueError:
            return code, raw
    try:
        return r.status, json.loads(raw or "null")
    except ValueError:
        return r.status, raw


def get_json(url, bearer=None):
    return request(url, bearer=bearer)[1]


def decode_jwt(jwt):
    """不解签，仅解析 id_token 的 payload 段用于展示。"""
    _, payload = jwt.split(".")[:2]
    pad = payload + "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(pad).decode("utf-8", "replace"))


def pj(label, obj):
    print("\n-- %s --" % label)
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def main():
    p = argparse.ArgumentParser(description="OAuth2 设备授权流演练（模拟设备端）")
    p.add_argument("--base", default="http://localhost:3000", help="授权站点地址，默认 %(default)s")
    p.add_argument("--client-id", default="1", help="已注册的客户端 ID，默认 %(default)s")
    p.add_argument("--scope", default="openid profile email")
    p.add_argument("--no-browser", action="store_true", help="不自动打开浏览器，改用 URL 提示")
    p.add_argument("--timeout", type=int, default=300, help="轮询令牌总超时秒数(对应设备码有效期)，默认 %(default)s")
    p.add_argument("--save", help="成功后把令牌与用户信息保存到该 json 文件")
    args = p.parse_args()

    base = args.base.rstrip("/")
    # 设备授权申请：参数放 query，端点为 POST，本身公开无需登录。
    q = urllib.parse.urlencode({"client_id": args.client_id, "scope": args.scope})
    st, j = request("%s/api/oauth2/device_authorization?%s" % (base, q), method="POST")
    d = j.get("data", j) if isinstance(j, dict) else j
    pj("device_authorization 申请", d)
    if isinstance(d, dict) and d.get("msg"):
        print("!! 申请设备授权失败：%s" % d["msg"])
        return
    device_code = d.get("device_code")
    user_code = d.get("user_code")
    verify_url = d.get("verification_uri_complete") or "%s/oauth2/device?user_code=%s" % (base, user_code)
    if not device_code:
        print("!! 未取得 device_code")
        return

    print("\n请在浏览器(已登录账户)确认此授权，用户码：** %s **" % user_code)
    if not args.no_browser:
        webbrowser.open(verify_url)
    else:
        print("验证地址(手动打开)：")
        print("  " + verify_url)
    print("等待用户在设备授权页确认后轮询令牌...")

    interval = int(d.get("interval") or 5)
    timeout = args.timeout
    deadline = time.time() + timeout
    tok = None
    while time.time() < deadline:
        st, r = request("%s/api/oauth2/token" % base, method="POST", json_body={
            "grant_type": GRANT_TYPE,
            "device_code": device_code,
        })
        if isinstance(r, dict) and r.get("access_token"):
            tok = r
            pj("token 响应", r)
            break
        msg = r.get("msg") if isinstance(r, dict) else str(r)
        print("[轮询] %s" % (msg or "未知结果"))
        if msg == "slow_down":
            interval += 5  # 服务端要求放缓轮询频率
        if msg in ("expired_token", "access_denied"):
            break
        time.sleep(interval)

    if not tok:
        print("\n!! 未在 %d 秒内完成授权，流程结束(设备码可能已过期)" % timeout)
        return

    claims = {}
    if tok.get("id_token"):
        claims = decode_jwt(tok["id_token"])
        pj("id_token 声明", claims)
    ui = get_json("%s/api/oauth2/userinfo" % base, bearer=tok["access_token"])
    pj("UserInfo", ui)

    if args.save:
        with open(args.save, "w", encoding="utf-8") as f:
            json.dump({"access_token": tok.get("access_token"),
                       "refresh_token": tok.get("refresh_token"),
                       "id_token": tok.get("id_token"),
                       "claims": claims,
                       "userinfo": ui}, f, ensure_ascii=False, indent=2)
        print("\n结果已保存到: %s" % args.save)


if __name__ == "__main__":
    main()