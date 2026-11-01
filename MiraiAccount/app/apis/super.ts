import { axios } from '@/utils/request'

// 与其他 API 一致：内部解包一层，返回 HTTP body，调用方再取 body.data / body.msg。
export const getSuperStatsApi = async () => {
  const { data } = await axios.get('/admin/super/stats')
  return data
}
export const cleanTargetApi = async (target: string) => {
  const { data } = await axios.post('/admin/super/clean', { target })
  return data
}
export const clearAllApi = async () => {
  const { data } = await axios.post('/admin/super/clear')
  return data
}
