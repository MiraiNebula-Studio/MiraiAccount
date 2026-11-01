import { ApiResponse, StatisticRes, SiteOptionsRes, SiteOptions } from '@/types'
import { axios } from '@/utils/request'

// 请求地址前缀
const baseURL = '/site'

// 获取站点统计数据
export const getStatisticApi = async () => {
  const { data }: { data: StatisticRes } = await axios.get(baseURL + '/statistic?t_=' + Date.now())
  return data
}

// 获取站点配置
export const getConfigApi = async () => {
  const { data }: { data: SiteOptionsRes } = await axios.get(baseURL + '/options?t_=' + Date.now())
  return data
}

// 修改站点配置
export const updateConfigApi = async (formData: SiteOptions) => {
  const { data }: { data: ApiResponse } = await axios.put(
    baseURL + '/options?t_=' + Date.now(),
    formData
  )
  return data
}

// 公开站点信息（标题 / URL / 邮箱验证开关），无需登录，供品牌展示与注册流程使用
export const getSitePublicApi = async () => {
  const { data }: { data: ApiResponse & { data: { title: string; url: string; emailVerify: boolean } } } =
    await axios.get(baseURL + '/public?t_=' + Date.now())
  return data
}
