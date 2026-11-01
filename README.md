<p align="center">
  <a href="https://lazy.ink/" target="blank"><img src="https://cdn.imlazy.ink:233/img/%E8%A1%A8%E6%83%85%E5%8C%85/%E7%8C%AB%E7%BE%BD%E9%9B%AB/023.png" width="200" alt="Logo" /></a>
</p>

<h1 align="center">MiraiAccount</h1>

<p align="center">
  <a href="./LICENSE">
    <img alt="License" src="https://img.shields.io/badge/license-Apache--2.0-blue?style=flat-square"/>
  </a>
  <a href="https://nodejs.org">
    <img alt="Static Badge" src="https://img.shields.io/badge/node-v18.17.1-blue.svg?style=flat-square" />
  </a>
</p>

## 项目介绍

MiraiAccount 是一个基于 OAuth2.0 / OIDC 标准的账号与单点登录服务平台：自建服务只需接入标准协议，即可复用统一的注册、登录、二次验证与会话管理能力。

当前版本是基于 Nuxt 4 的**重制版**，前端与 Nitro 后端同处一个工程，替代了早期 NestJS + Vue 的前后端分离架构。

- 图标及形象来自画师[甘城なつき](https://www.pixiv.net/users/3036679)笔下的猫羽雫

### 衍生说明

本项目是基于 [Nyancy-Org/NyancyAccount](https://github.com/Nyancy-Org/NyancyAccount)（Apache-2.0）的重制版本，主要改动：

- 架构：NestJS 后端 + 独立 Vue 前端 → Nuxt 4 全栈（Vue 3 + Vuetify 3 + Nitro + MikroORM）
- 新增：WebAuthn/Passkey 登录、TOTP 两步验证与恢复码、设备授权流、OIDC 身份提供者（RS256 ID Token）
- 新增：多设备会话管理、操作审计、站内公告与消息、账号数据导出
- 加固：管理员账户注销保护、维护模式、开箱向导的数据库连通性预检

上游的版权声明与许可证保留在 [LICENSE](./LICENSE) 中，本项目名称与品牌已更改为 MiraiAccount。

## 使用文档

- [使用文档](./NyancyAccount/docs/USAGE.md) — 面向访客、用户、管理员与超管的功能说明
- [部署文档](./NyancyAccount/docs/DEPLOYMENT.md) — 环境要求、源码部署、Nginx 反向代理与生产安全
- [Docker 部署](./NyancyAccount/docs/DOCKER.md) — 基于 Docker Compose 的一键部署

## 目录结构

- `NyancyAccount/` — 应用主体（Nuxt 4 全栈：前端 + Nitro API + MikroORM）
- `tools/` — 接口测试脚本

> 应用目录名沿用自上游工程，尚未随品牌更名（重命名目录会导致 pnpm 的 node_modules 软链接失效，需重新安装依赖）。

## 功能

- 用户注册、登录，支持 TOTP 两步验证与 WebAuthn 无密码登录
- 基于 OAuth2.0 标准的授权码（含 PKCE）与设备授权流程
- OIDC 身份提供者，签发 RS256 签名的 ID Token
- 会话管理：多设备会话列表与单点吊销
- 管理后台与超管权限分级，站点配置与数据清理
- 站内公告（同一时间仅一条生效）与定向站内信
- 站点运行态保护：管理员账户缺失时进入维护模式，不对外提供服务

## 许可证

根据 [Apache 2.0](./LICENSE) 协议开源。本项目的原始版本版权归 Nyancy-Org 及贡献者所有，衍生部分的修改同样以 Apache 2.0 发布。
