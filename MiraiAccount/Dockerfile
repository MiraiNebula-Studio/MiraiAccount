# 多阶段构建，运行镜像仅携带 .output 产物。
FROM node:22-alpine AS build
# 启用 corepack 以使用锁定的 pnpm@11。
RUN corepack enable
# ts-ip2region2 为原生 node-gyp addon，alpine 需补齐编译工具链。
RUN apk add --no-cache --virtual .build-deps python3 make g++
# 先拷清单利用层缓存，--frozen-lockfile 保证安装可复现。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
# 清理仅构建期所需的编译工具链，避免带入运行镜像。
RUN apk del .build-deps

FROM node:22-alpine AS run
WORKDIR /app
# Nitro 产物自带 server/node_modules，可独立运行。
COPY --from=build /build/.output ./.output
# ip2region 原生 addon 不在 Nitro 产物内，需随包复制（含编译产物与数据），否则运行时归属地全为 Unknown。
COPY --from=build /build/node_modules/ts-ip2region2 /app/node_modules/ts-ip2region2
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
# config.json 挂载于 /app/config.json，NUXT_SESSION_PASSWORD 由编排层注入。
CMD ["node", ".output/server/index.mjs"]