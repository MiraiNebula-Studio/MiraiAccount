#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""弗域账号授权全链路测试 CLI。

子命令直接执行单步验证；不带子命令进入交互菜单。
覆盖：登录(含 TOTP 两步)、登出、会话管理、用户信息、
OAuth2 授权码流、设备授权流(RFC8628)、OIDC 发现/JWKS/UserInfo、
OAuth2 客户端应用管理。

仅依赖 Python 标准库。

常用：
  python auth_test.py login --username alice --password xxx
  python auth_test.py --cookie sess.txt login --username alice --password xxx
  python auth_test.py --cookie sess.txt authcode --client-id 1 --client-secret <secret> --redirect-uri http://localhost:3000/
  python auth_test.py --cookie sess.txt device --client-id 1 --authorize-now
  python auth_test.py --cookie sess.txt oidc | jwks | myinfo | logout
  python auth_test.py            # 交互菜单
"""
import argparse
import base64
import getpass
import http.cookiejar
import http.server
import json
import os
import secrets
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

DEFAULT_BASE = "http://localhost:3000"


def A(args, key, default=None):
    """安全取命令行参数：子命令缺省时为 None，供交互菜单复用同一批 handler。"""
    return getattr(args, key, default) if args is not None else default


class Sauce:
    """极简 HTTP 客户端：自动携带/保存会话 Cookie，统一处理 JSON 业务响应。"""

    def __init__(self, base, cookie_file=None):
        self.base = base.rstrip("/")
        self.jar = http.cookiejar.MozillaCookieJar()
        self.cookie_file = cookie_file
        if cookie_file and os.path.exists(cookie_file):
            try:
                self.jar.load(cookie_file, ignore_discard=True, ignore_expires=True)
            except Exception:
                pass
        self.opener = urllib.request.build_opener(
            urllib.request.HTTPCookieProcessor(self.jar)
        )

    def req(self, method, path, body=None, query=None, bearer=None):
        url = self.base + path
        if query:
            q = {k: v for k, v in query.items() if v is not None}
            if q:
                url += "?" + urllib.parse.urlencode(q)
        hdrs = {"User-Agent": "auth-test-cli/1.0"}
        data = None
        if body is not None:
            if isinstance(body, dict):
                hdrs["Content-Type"] = "application/json"
                data = json.dumps(body).encode("utf-8")
            else:
                data = body
        if bearer:
            hdrs["Authorization"] = "Bearer " + bearer
        req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
        try:
            resp = self.opener.open(req, timeout=30)
            status, raw = resp.status, resp.read()
        except urllib.error.HTTPError as e:
            status, raw = e.code, e.read()
        text = raw.decode("utf-8", "replace") if raw else ""
        try:
            parsed = json.loads(text) if text.strip() else None
        except ValueError:
            parsed = text
        return status, parsed

    def save_cookies(self):
        if self.cookie_file:
            try:
                self.jar.save(self.cookie_file, ignore_discard=True, ignore_expires=True)
            except Exception:
                pass

    @staticmethod
    def business(j):
        # 剥掉 {code,msg,data,time} 包装返回 data；raw 端点原样返回。
        if isinstance(j, dict) and "code" in j and "data" in j:
            return j["data"]
        return j


def pj(label, obj):
    print("\n-- %s --" % label)
    print(json.dumps(obj, ensure_ascii=False, indent=2) if not isinstance(obj, str) else obj)


def decode_jwt(jwt):
    """不解签，仅解码 JWT 三段(header/payload/signature)中的 payload。"""
    try:
        _, payload = jwt.split(".")[:2]
        pad = lambda s: s + "=" * (-len(s) % 4)
        return json.loads(base64.urlsafe_b64decode(pad(payload)).decode("utf-8", "replace"))
    except Exception:
        return {"_error": "id_token 不是合法 JWT 或解析失败"}


# ---------------- 登录 / 会话 ----------------

def ensure_login(s, args):
    """探测当前会话，未登录且提供了凭据则自动登录，否则返回 False 并提示。"""
    _, j = s.req("GET", "/api/auth/check")
    if s.business(j).get("isLogin"):
        return True
    user = A(args, "username")
    pwd = A(args, "password")
    if not user:
        print("!! 当前会话未登录：请先运行 login，或为本命令传 --username/--password 自动登录")
        return False
    st, j = s.req("POST", "/api/auth/login", body={"username": user, "password": pwd})
    d = s.business(j)
    if isinstance(d, dict) and d.get("needTOTP"):
        code = input("账户启用了二步验证，请输入验证码: ").strip()
        s.req("POST", "/api/auth/totp", body={"code": code})
    s.save_cookies()
    _, j = s.req("GET", "/api/auth/check")
    ok = s.business(j).get("isLogin")
    print(("已自动登录会话" if ok else "!! 自动登录失败，请检查账号密码"))
    return ok


def cmd_login(s, args):
    user = A(args, "username") or input("用户名/邮箱: ").strip()
    pwd = A(args, "password") or getpass.getpass("密码: ")
    st, j = s.req("POST", "/api/auth/login", body={"username": user, "password": pwd})
    d = s.business(j)
    if isinstance(d, dict) and d.get("needTOTP"):
        # 账户启用二步验证：读码再次提交后才真正建立登录态。
        code = input("该账户启用了二步验证，请输入验证码: ").strip()
        st, j = s.req("POST", "/api/auth/totp", body={"code": code})
        d = s.business(j)
    s.save_cookies()
    pj("登录结果", j)
    pj("业务数据", d)


def cmd_logout(s, args):
    st, j = s.req("POST", "/api/auth/logout")
    s.save_cookies()
    pj("登出", j)


def cmd_myinfo(s, args):
    st, j = s.req("GET", "/api/user/info")
    pj("当前用户信息", s.business(j))


def cmd_sessions(s, args):
    if A(args, "revoke_all", False):
        st, j = s.req("DELETE", "/api/user/sessions")
        pj("退出全部设备", j)
        return
    st, j = s.req("GET", "/api/user/sessions")
    pj("活跃会话", s.business(j))
    sid = A(args, "revoke")
    if sid:
        st, j = s.req("DELETE", "/api/user/sessions/" + urllib.parse.quote(sid))
        pj("下线会话", j)


# ---------------- OAuth2 客户端管理 ----------------

def cmd_client(s, args):
    action = A(args, "action", "list")
    if action == "create":
        name = A(args, "name") or input("应用名称: ").strip()
        redirect = A(args, "redirect") or input("回调 Url: ").strip()
        st, j = s.req("POST", "/api/oauth2/user/client", body={"name": name, "redirect": redirect})
    elif action == "reset":
        cid = A(args, "id") or int(input("客户端 ID: ").strip())
        st, j = s.req("PUT", "/api/oauth2/user/client/reset/" + str(cid))
    elif action == "delete":
        cid = A(args, "id") or int(input("客户端 ID: ").strip())
        st, j = s.req("DELETE", "/api/oauth2/user/client", body={"id": cid})
    else:
        st, j = s.req("GET", "/api/oauth2/user/clients")
    pj("客户端操作(" + action + ")", s.business(j))


# ---------------- OAuth2 授权码流 ----------------

class _CallbackHandler(http.server.BaseHTTPRequestHandler):
    """浏览器授权回调：把 code/state 存入 server 供主流程取用。"""

    def do_GET(self):
        self.server.result = urllib.parse.parse_qs(
            urllib.parse.urlparse(self.path).query)
        self.server.done.set()
        body = "<h2>授权成功，可关闭本标签页</h2>".encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def browser_authcode(s, args, port):
    """打开浏览器走真实授权码流：本地回调等 code 重定向回来，返回 (code, redirect_uri)。"""
    client_id = A(args, "client_id") or input("client_id: ").strip()
    state = secrets.token_hex(8)
    nonce = secrets.token_hex(8)
    redirect = "http://127.0.0.1:%d/callback" % port

    srv = http.server.HTTPServer(("127.0.0.1", port), _CallbackHandler)
    srv.result, srv.done = None, threading.Event()
    q = urllib.parse.urlencode({
        "client_id": client_id,
        "response_type": "code",
        "redirect_uri": redirect,
        "scope": A(args, "scope", "openid profile email"),
        "state": state,
        "nonce": nonce,
    })
    url = "%s/oauth2/authorize?%s" % (s.base, q)
    print("浏览器中完成登录并点「授权」，等待回调(端口 %d)..." % port)
    print("  " + url)
    webbrowser.open(url)

    threading.Thread(target=srv.serve_forever, daemon=True).start()
    if not srv.done.wait(timeout=int(A(args, "timeout", 300))):
        srv.shutdown()
        raise SystemExit("!! 等待浏览器授权回调超时")
    srv.shutdown()
    query = srv.result or {}
    if query.get("error"):
        raise SystemExit("!! 授权被拒绝：%s" % query["error"][0])
    if (query.get("state") or [""])[0] != state:
        raise SystemExit("!! state 不匹配，可能遭受 CSRF 攻击")
    return (query.get("code") or [""])[0], redirect


def cmd_authcode(s, args):
    if A(args, "browser", False):
        # 浏览器授权：无需本进程入侵登录态，由用户在浏览器内完成登录与同意。
        code, redirect = browser_authcode(s, args, A(args, "port", 8888))
        client_id = A(args, "client_id") or input("client_id: ").strip()
        client_secret = A(args, "client_secret") or input("client_secret: ").strip()
        body = {
            "grant_type": "authorization_code",
            "client_id": str(client_id),
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect,
        }
        stt, tok = s.req("POST", "/api/oauth2/token", body=body)
        pj("token 响应", tok)
        if isinstance(tok, dict) and tok.get("access_token"):
            if tok.get("id_token"):
                pj("id_token 声明", decode_jwt(tok["id_token"]))
            cmd_userinfo(s, args, bearer=tok["access_token"])
        return

    # API 直调：签发 code 的端点须已登录，未登录则自动登录或友善提示。
    if not ensure_login(s, args):
        return
    client_id = A(args, "client_id") or input("client_id: ").strip()
    redirect_uri = A(args, "redirect_uri") or input("redirect_uri: ").strip()
    client_secret = A(args, "client_secret") or input("client_secret: ").strip()
    q = {
        "client_id": str(client_id),
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": A(args, "scope", "openid profile email"),
        "state": A(args, "state", "cli-state"),
        "nonce": A(args, "nonce", "cli-nonce"),
    }
    st, j = s.req("POST", "/api/oauth2/authorize", query=q)
    pj("authorize 响应", j)
    code = (s.business(j) or {}).get("code")
    if not code:
        print("!! 未取得授权码（确认已登录、回调与客户端注册一致、scope 合法）")
        return
    body = {
        "grant_type": "authorization_code",
        "client_id": str(client_id),
        "client_secret": client_secret,
        "code": code,
        "redirect_uri": redirect_uri,
    }
    stt, tok = s.req("POST", "/api/oauth2/token", body=body)
    pj("token 响应", tok)
    if isinstance(tok, dict) and tok.get("access_token"):
        if tok.get("id_token"):
            pj("id_token 声明", decode_jwt(tok["id_token"]))
        cmd_userinfo(s, args, bearer=tok["access_token"])


# ---------------- OAuth2 设备授权流 (RFC8628) ----------------

def cmd_device(s, args):
    client_id = A(args, "client_id") or input("client_id: ").strip()
    # 设备端点公开可申请 device_code，无需登录；但授权时若用 --authorize-now 需登录态。
    if A(args, "authorize_now", False) and not ensure_login(s, args):
        return
    scope = A(args, "scope", "openid profile email")
    st, j = s.req("POST", "/api/oauth2/device_authorization", query={"client_id": str(client_id), "scope": scope})
    d = s.business(j)
    pj("device_authorization 响应", d)
    device_code = d.get("device_code")
    user_code = d.get("user_code")
    interval = int(d.get("interval") or 5)
    if not device_code:
        print("!! 未取得 device_code")
        return

    if A(args, "authorize_now", False):
        # 用当前登录态模拟用户授权该 user_code。
        st2, j2 = s.req("POST", "/api/oauth2/device", body={"user_code": user_code})
        pj("用户授权结果", j2)
    else:
        print("\n请在已登录的会话去授权，或手动调用以下端点: POST /api/oauth2/device {user_code}")
        print("  授权地址: %s" % d.get("verification_uri_complete"))
        print("  用户码: %s" % user_code)
        wait = A(args, "wait")
        if wait:
            print("等待 %.0f 秒让其它会话完成授权..." % float(wait))
            time.sleep(float(wait))
        else:
            input("在其他会话完成授权后按回车，开始轮询 token...")

    poll = A(args, "poll", 40)
    for attempt in range(1, int(poll) + 1):
        body = {
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "device_code": device_code,
        }
        stt, tok = s.req("POST", "/api/oauth2/token", body=body)
        if isinstance(tok, dict) and tok.get("access_token"):
            pj("token 响应", tok)
            if tok.get("id_token"):
                pj("id_token 声明", decode_jwt(tok["id_token"]))
            cmd_userinfo(s, args, bearer=tok["access_token"])
            return
        msg = str(tok.get("msg") or tok) if isinstance(tok, dict) else tok
        print("[轮询 %d/%d] %s" % (attempt, int(poll), msg))
        if msg == "slow_down":
            interval += 5
        if msg in ("expired_token", "access_denied"):
            break
        time.sleep(interval)


# ---------------- OIDC ----------------

def cmd_oidc(s, args):
    # 发现/JWKS 端点在 nitro 渲染器根路径注册(无 /api 前缀)，依赖方按 issuer 直接拉取。
    st, j = s.req("GET", "/.well-known/openid-configuration")
    pj("OIDC 发现文档", j)


def cmd_jwks(s, args):
    st, j = s.req("GET", "/.well-known/jwks.json")
    pj("JWKS", j)


def cmd_userinfo(s, args, bearer=None):
    token = bearer or A(args, "token") or input("access_token: ").strip()
    st, j = s.req("GET", "/api/oauth2/userinfo", bearer=token)
    pj("UserInfo", j)


# ---------------- 交互菜单 ----------------

CMDS = {
    "login": ("用户名密码登录(含 TOTP)", cmd_login),
    "logout": ("登出当前会话", cmd_logout),
    "myinfo": ("当前登录用户信息", cmd_myinfo),
    "sessions": ("查看/下线会话", cmd_sessions),
    "client": ("创建/列出 OAuth2 客户端", cmd_client),
    "authcode": ("授权码流完整演练", cmd_authcode),
    "device": ("设备授权流完整演练", cmd_device),
    "oidc": ("拉取 OIDC 发现文档", cmd_oidc),
    "jwks": ("拉取公钥 JWKS", cmd_jwks),
    "userinfo": ("用 access_token 查 UserInfo", cmd_userinfo),
}


def menu(s, args):
    while True:
        os.system("cls" if os.name == "nt" else "clear")
        print("== 弗域账号授权 CLI 测试 ==  base: %s" % s.base)
        for name, (desc, _) in CMDS.items():
            print("  %-10s %s" % (name, desc))
        print("  quit/exit  退出菜单")
        choice = input("\n> ").strip().lower()
        if choice in ("quit", "exit", "q", ""):
            break
        fn = CMDS.get(choice)
        if fn:
            fn[1](s, args)
        else:
            print("未知命令: %s" % choice)
        input("\n按回车返回菜单...")


def build_parser():
    p = argparse.ArgumentParser(description="弗域账号授权 CLI 测试")
    p.add_argument("--base", default=DEFAULT_BASE, help="站点地址，默认 %(default)s")
    p.add_argument("--cookie", help="Cookie 文件路径，跨命令共享登录态")
    sub = p.add_subparsers(dest="cmd")

    sp = sub.add_parser("sessions")
    sp.add_argument("--revoke-all", action="store_true")
    sp.add_argument("--revoke", help="下线指定 sid")

    cp = sub.add_parser("client")
    cp.add_argument("action", nargs="?", choices=["list", "create", "reset", "delete"], default="list")
    cp.add_argument("--id", type=int)
    cp.add_argument("--name")
    cp.add_argument("--redirect")

    lp = sub.add_parser("login")
    lp.add_argument("--username", help="用户名或邮箱，缺省交互输入")
    lp.add_argument("--password", help="密码，缺省安全交互输入")
    sub.add_parser("logout")
    sub.add_parser("myinfo")
    sub.add_parser("oidc")
    sub.add_parser("jwks")

    ac = sub.add_parser("authcode")
    ac.add_argument("--client-id")
    ac.add_argument("--client-secret")
    ac.add_argument("--redirect-uri", help="API 直调模式使用；浏览器模式固定本机回调，可忽略")
    ac.add_argument("--username", help="未登录时自动登录(API 直调模式)")
    ac.add_argument("--password", help="未登录时自动登录(API 直调模式)")
    ac.add_argument("--browser", action="store_true", help="打开浏览器完成授权(默认 API 直调，需已登录)")
    ac.add_argument("--port", type=int, default=8888, help="浏览器模式本机回调端口，默认 %(default)s")
    ac.add_argument("--timeout", type=int, default=300, help="浏览器模式等待授权超时秒数，默认 %(default)s")
    ac.add_argument("--scope", default="openid profile email")
    ac.add_argument("--state", default="cli-state")
    ac.add_argument("--nonce", default="cli-nonce")

    dv = sub.add_parser("device")
    dv.add_argument("--client-id")
    dv.add_argument("--scope", default="openid profile email")
    dv.add_argument("--username", help="--authorize-now 且未登录时自动登录")
    dv.add_argument("--password", help="--authorize-now 且未登录时自动登录")
    dv.add_argument("--authorize-now", action="store_true", help="用当前登录态自动授权 user_code")
    dv.add_argument("--wait", type=float, help="授权前等待秒数(手动模式)")
    dv.add_argument("--poll", type=int, help="最大轮询次数，默认 40")

    ui = sub.add_parser("userinfo")
    ui.add_argument("--token")

    return p


def main():
    args = build_parser().parse_args()
    s = Sauce(args.base, args.cookie)
    if args.cmd:
        CMDS[args.cmd][1](s, args)
        s.save_cookies()
    else:
        menu(s, args)


if __name__ == "__main__":
    main()