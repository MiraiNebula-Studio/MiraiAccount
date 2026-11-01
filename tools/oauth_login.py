#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""OAuth2 授权码登录演练（模拟第三方依赖方）。

本地启动临时回调服务，浏览器打开授权页完成登录/授权后，授权服务器把
code 重定向回本机，脚本核对 state、用 client_secret 换 token、
校验 id_token 的 nonce 并拉取 UserInfo。仅依赖 Python 标准库。

前提：客户端已注册，且注册的 redirect_uri 与 --redirect-uri 完全一致
（可用 tools/auth_test.py client create/reset 管理）。

用法：
  python tools/oauth_login.py --base http://localhost:3000 --client-id 1 --client-secret <secret>
  python tools/oauth_login.py --base http://localhost:3000 --client-id 1 --client-secret <secret> --save token.json
"""
import argparse
import base64
import http.server
import json
import secrets
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser


def post(url, fields):
    """表单 POST：OAuth token 端点按 client_secret_post 约定接收参数。"""
    data = urllib.parse.urlencode(fields).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode("utf-8", "replace"))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode("utf-8", "replace"))


def get_json(url, bearer=None):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    if bearer:
        req.add_header("Authorization", "Bearer " + bearer)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def decode_jwt(jwt):
    """不解签，仅解析 id_token 的 payload 段用于展示与 nonce 校验。"""
    _, payload = jwt.split(".")[:2]
    pad = payload + "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(pad).decode("utf-8", "replace"))


def pj(label, obj):
    print("\n-- %s --" % label)
    print(json.dumps(obj, ensure_ascii=False, indent=2))


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    """接收回调，把 code/state 查询串暂存到 server 供主线程取用。"""

    def do_GET(self):
        query = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        self.server.result = query
        self.server.done.set()
        body = "<h2>授权成功，可关闭本标签页</h2>".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def main():
    p = argparse.ArgumentParser(description="OAuth2 授权码登录演练（模拟第三方应用）")
    p.add_argument("--base", default="http://localhost:3000", help="授权站点地址，默认 %(default)s")
    p.add_argument("--client-id", default="1", help="已注册的客户端 ID")
    p.add_argument("--client-secret", required=True, help="客户端密钥(创建/重置后获取)")
    p.add_argument("--redirect-uri", help="本机回调地址，须与客户端注册值完全一致")
    p.add_argument("--port", type=int, default=8888, help="本机回调监听端口，默认 %(default)s")
    p.add_argument("--scope", default="openid profile email")
    p.add_argument("--state", help="防 CSRF 随机串(默认自动生成)")
    p.add_argument("--nonce", help="防重放随机串(默认自动生成)")
    p.add_argument("--no-browser", action="store_true", help="不自动打开浏览器")
    p.add_argument("--timeout", type=int, default=300, help="等待回调超时秒数，默认 %(default)s")
    p.add_argument("--save", help="将 token 与用户信息保存到该 json 文件")
    args = p.parse_args()

    state = args.state or secrets.token_hex(8)
    nonce = args.nonce or secrets.token_hex(8)
    redirect = args.redirect_uri or "http://127.0.0.1:%d/callback" % args.port

    srv = http.server.HTTPServer(("127.0.0.1", args.port), CallbackHandler)
    srv.result, srv.done = None, threading.Event()

    q = urllib.parse.urlencode({
        "client_id": args.client_id,
        "response_type": "code",
        "redirect_uri": redirect,
        "scope": args.scope,
        "state": state,
        "nonce": nonce,
    })
    auth_url = "%s/oauth2/authorize?%s" % (args.base.rstrip("/"), q)
    print("授权地址：")
    print("  " + auth_url)
    if not args.no_browser:
        webbrowser.open(auth_url)

    print("等待授权回调(本机端口 %d)..." % args.port)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    if not srv.done.wait(timeout=args.timeout):
        print("!! 等待授权回调超时，流程中止")
        srv.shutdown()
        return
    srv.shutdown()
    query = srv.result or {}

    if query.get("error"):
        pj("授权失败", {"error": query["error"][0],
                         "error_description": (query.get("error_description") or [""])[0]})
        return

    ret_state = (query.get("state") or [""])[0]
    if ret_state != state:
        pj("回调校验失败", {"msg": "state 不匹配，可能遭受 CSRF 攻击"})
        return
    code = (query.get("code") or [""])[0]
    print("\n已取得授权码: %s" % code)

    st, tok = post("%s/api/oauth2/token" % args.base.rstrip("/"), {
        "grant_type": "authorization_code",
        "client_id": args.client_id,
        "client_secret": args.client_secret,
        "code": code,
        "redirect_uri": redirect,
    })
    pj("token 响应(HTTP %d)" % st, tok)
    if st != 200 or not tok.get("access_token"):
        print("!! 换取 token 失败")
        return

    claims = decode_jwt(tok["id_token"]) if tok.get("id_token") else {}
    if not tok.get("id_token"):
        claims["_nonce_check"] = "N/A"
    elif claims.get("nonce") == nonce:
        claims["_nonce_check"] = "OK"
    else:
        print("!! nonce 校验失败（id_token 的 nonce 与请求不一致，疑似重放攻击）")
        claims["_nonce_check"] = "FAIL"
    if tok.get("id_token"):
        pj("id_token 声明", claims)

    ui = get_json("%s/api/oauth2/userinfo" % args.base.rstrip("/"), bearer=tok["access_token"])
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