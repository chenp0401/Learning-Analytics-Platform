import axios from 'axios'

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 后续可添加 token 等认证信息
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.detail || '请求失败，请稍后重试'
    console.error('API Error:', message)
    return Promise.reject(error)
  }
)

// ==================== 文本校对 API ====================
export const proofreadApi = {
  /** 提交文本进行校对 */
  check: (text: string) =>
    apiClient.post('/proofread/check', { text }),

  /** 上传文件进行校对 */
  uploadAndCheck: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/proofread/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ==================== 文档查重 API ====================
export const dedupApi = {
  /** 上传文件进行查重 */
  check: (files: File[]) => {
    const formData = new FormData()
    files.forEach((file) => formData.append('files', file))
    return apiClient.post('/dedup/check', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 获取查重结果详情 */
  getResult: (taskId: string) =>
    apiClient.get(`/dedup/result/${taskId}`),
}

// ==================== 数据分析 API ====================
export const analysisApi = {
  /** 上传 CSV 文件 */
  uploadCsv: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.post('/analysis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  /** 获取成绩分布 */
  getDistribution: (datasetId: string) =>
    apiClient.get(`/analysis/distribution/${datasetId}`),

  /** 获取题目难度分析 */
  getDifficulty: (datasetId: string) =>
    apiClient.get(`/analysis/difficulty/${datasetId}`),

  /** 获取区分度分析 */
  getDiscrimination: (datasetId: string) =>
    apiClient.get(`/analysis/discrimination/${datasetId}`),

  /** 获取信度分析 */
  getReliability: (datasetId: string) =>
    apiClient.get(`/analysis/reliability/${datasetId}`),

  /** 获取综合 Dashboard 数据 */
  getDashboard: (datasetId: string) =>
    apiClient.get(`/analysis/dashboard/${datasetId}`),
}

export default apiClient
