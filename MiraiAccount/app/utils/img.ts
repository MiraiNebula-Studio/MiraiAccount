// 图片统一走服务端代理以启用缓存，并为加载期预留占位，避免布局抖动。
export const proxyImg = (raw: string): string => `/api/img?url=${encodeURIComponent(raw)}`

// 中性灰占位图（可缩放矢量），加载期占住坑位，避免空白破相。
export const IMG_PLACEHOLDER =
  'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20200%20200%22%20preserveAspectRatio=%22xMidYMid%20slice%22%3E%3Crect%20width=%22200%22%20height=%22200%22%20fill=%22%23e8ecf1%22/%3E%3C/svg%3E'