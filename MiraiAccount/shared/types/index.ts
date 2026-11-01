// 统一响应包装结构，保持全站一致的响应格式。
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  time?: number;
  path?: string;
}

// 登录用户脱敏信息（service 层产出，前端 useUser 消费）。
export interface UserSessionInfo {
  id: number;
  username?: string;
  status?: number;
  role?: string;
  email?: string;
  regTime?: string;
  apikey?: string;
  authDevice?: { credentialID: string }[] | null;
  lastLoginIp?: string;
  lastLoginTime?: Date;
}