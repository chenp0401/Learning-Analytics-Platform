import { useState } from 'react'
import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DatasetComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import {
  BarChart3,
  Upload,
  Database,
  TrendingUp,
  Target,
  Shield,
  Award,
  Download,
  Loader2,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import FileUpload from '@/components/FileUpload'
import { analysisApi } from '@/services/api'

// 注册 ECharts 组件
echarts.use([
  BarChart,
  LineChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  LegendComponent,
  DatasetComponent,
  CanvasRenderer,
])

const navItems = [
  { key: 'distribution', label: '成绩分布', icon: BarChart3 },
  { key: 'difficulty', label: '难度分析', icon: Target },
  { key: 'discrimination', label: '区分度', icon: TrendingUp },
  { key: 'reliability', label: '信效度', icon: Shield },
]

export default function Analysis() {
  const [activeTab, setActiveTab] = useState('distribution')
  const [hasData, setHasData] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [datasetId, setDatasetId] = useState('')

  // 真实数据状态
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [distributionData, setDistributionData] = useState<any>(null)
  const [difficultyData, setDifficultyData] = useState<any[]>([])
  const [discriminationData, setDiscriminationData] = useState<any[]>([])
  const [reliabilityData, setReliabilityData] = useState<any>(null)

  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return
    setIsLoading(true)
    setErrorMessage('')

    try {
      // 上传 CSV 文件
      const uploadResult: any = await analysisApi.uploadCsv(files[0])
      const data = uploadResult.data || uploadResult
      const dsId = data.dataset_id

      setDatasetId(dsId)

      // 获取 Dashboard 数据
      const dashResult: any = await analysisApi.getDashboard(dsId)
      const dash = dashResult.data || dashResult

      setDashboardData(dash)
      setDistributionData(dash.distribution)
      setDifficultyData(dash.difficulty || [])
      setDiscriminationData(dash.discrimination || [])
      setReliabilityData(dash.reliability)
      setHasData(true)
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || '数据分析失败，请稍后重试'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  // 成绩分布直方图配置
  const getDistributionOption = () => {
    if (!distributionData?.histogram) return {}
    return {
      tooltip: { trigger: 'axis' as const },
      xAxis: {
        type: 'category' as const,
        name: '分数段',
        data: distributionData.histogram.bins || [],
      },
      yAxis: { type: 'value' as const, name: '人数' },
      series: [
        {
          name: '人数',
          type: 'bar',
          data: distributionData.histogram.counts || [],
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#93c5fd' },
            ]),
            borderRadius: [4, 4, 0, 0],
          },
        },
      ],
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    }
  }

  // 难度系数图表配置
  const getDifficultyOption = () => {
    if (!difficultyData.length) return {}
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['难度系数'] },
      xAxis: {
        type: 'category' as const,
        data: difficultyData.map((d: any) => d.question),
        axisLabel: { rotate: 30 },
      },
      yAxis: { type: 'value' as const, min: 0, max: 1 },
      series: [
        {
          name: '难度系数',
          type: 'bar',
          data: difficultyData.map((d: any) => d.difficulty),
          itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] },
        },
      ],
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    }
  }

  // 区分度图表配置
  const getDiscriminationOption = () => {
    if (!discriminationData.length) return {}
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['区分度'] },
      xAxis: {
        type: 'category' as const,
        data: discriminationData.map((d: any) => d.question),
        axisLabel: { rotate: 30 },
      },
      yAxis: { type: 'value' as const },
      series: [
        {
          name: '区分度',
          type: 'line',
          data: discriminationData.map((d: any) => d.discrimination),
          itemStyle: { color: '#f59e0b' },
          lineStyle: { width: 2 },
          symbol: 'circle',
          symbolSize: 8,
        },
      ],
      grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
    }
  }

  // 统计摘要
  const stats = distributionData?.statistics || {}

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据分析</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              考试成绩分布、题目难度、区分度、信度效度分析
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium">智能统计</span>
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 mb-8 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <span>{errorMessage}</span>
        </div>
      )}

      {!hasData && (
        <Card className="mb-8 border-gray-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold">选择数据源</CardTitle>
            <CardDescription>上传 CSV 文件导入考试数据，系统将自动进行统计分析</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                    <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  </div>
                  CSV 文件上传
                </div>
                <FileUpload
                  accept={{ 'text/csv': ['.csv'] }}
                  maxFiles={1}
                  description="拖拽 CSV 成绩文件到此处"
                  onFilesChange={handleFileUpload}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                    <Database className="h-4 w-4 text-gray-400" />
                  </div>
                  数据库连接
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50/50">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Database className="h-7 w-7 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400 font-medium">数据库连接功能开发中</p>
                  <p className="text-xs text-gray-300 mt-1">即将支持 MySQL / PostgreSQL 直连</p>
                  <Button variant="outline" size="sm" className="mt-4 rounded-lg" disabled>
                    配置连接
                  </Button>
                </div>
              </div>
            </div>
            {isLoading && (
              <div className="flex items-center justify-center gap-3 mt-8 py-4 bg-blue-50 rounded-xl border border-blue-100 animate-fade-in">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm font-medium text-blue-700">正在分析数据，请稍候...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {hasData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8 animate-fade-in-up">
            {[
              { label: '平均分', value: stats.mean ?? '-', icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-100' },
              { label: '最高分', value: stats.max ?? '-', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', borderColor: 'border-emerald-100' },
              { label: '最低分', value: stats.min ?? '-', icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-100' },
              { label: '中位数', value: stats.median ?? '-', icon: Target, color: 'text-violet-600', bg: 'bg-violet-50', borderColor: 'border-violet-100' },
              { label: '及格率', value: stats.pass_rate != null ? stats.pass_rate + '%' : '-', icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-100' },
              { label: 'α 信度', value: reliabilityData?.cronbach_alpha ?? '-', icon: Shield, color: 'text-indigo-600', bg: 'bg-indigo-50', borderColor: 'border-indigo-100' },
            ].map((stat) => (
              <Card key={stat.label} className="card-hover border-gray-100 shadow-sm">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-7 h-7 rounded-lg ${stat.bg} flex items-center justify-center`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">{stat.label}</span>
                  </div>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-1.5">
              {navItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === item.key
                      ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
              <div className="pt-5">
                <Button variant="outline" className="w-full gap-2 h-10 rounded-xl border-gray-200">
                  <Download className="h-4 w-4" />
                  导出报告
                </Button>
              </div>
            </div>

            <div className="lg:col-span-3">
              <Card className="border-gray-100 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base font-semibold">
                    {navItems.find((n) => n.key === activeTab)?.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activeTab === 'distribution' && distributionData && (
                    <ReactEChartsCore
                      echarts={echarts}
                      option={getDistributionOption()}
                      style={{ height: '400px' }}
                    />
                  )}
                  {activeTab === 'difficulty' && difficultyData.length > 0 && (
                    <ReactEChartsCore
                      echarts={echarts}
                      option={getDifficultyOption()}
                      style={{ height: '400px' }}
                    />
                  )}
                  {activeTab === 'discrimination' && discriminationData.length > 0 && (
                    <div className="space-y-4">
                      <ReactEChartsCore
                        echarts={echarts}
                        option={getDiscriminationOption()}
                        style={{ height: '400px' }}
                      />
                      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-sm text-blue-700">
                        <p className="font-semibold mb-1.5">区分度指标说明</p>
                        <p className="leading-relaxed">D ≥ 0.4：优秀 | 0.3 ≤ D &lt; 0.4：良好 | 0.2 ≤ D &lt; 0.3：一般 | D &lt; 0.2：较差</p>
                      </div>
                    </div>
                  )}
                  {activeTab === 'reliability' && reliabilityData && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="p-8 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl text-center border border-indigo-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Cronbach's Alpha</p>
                          <p className="text-5xl font-bold text-indigo-600">{reliabilityData.cronbach_alpha}</p>
                          <p className={`text-sm mt-3 font-medium ${reliabilityData.cronbach_alpha >= 0.7 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {reliabilityData.cronbach_alpha >= 0.7 ? '✓' : '✗'} 信度{reliabilityData.alpha_level}
                          </p>
                        </div>
                        <div className="p-8 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl text-center border border-violet-100">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">KR-20 信度</p>
                          <p className="text-5xl font-bold text-violet-600">
                            {reliabilityData.kr20 != null ? reliabilityData.kr20 : 'N/A'}
                          </p>
                          <p className="text-sm text-gray-500 mt-3">
                            {reliabilityData.kr20 != null ? '适用于二分计分' : '非二分计分题目'}
                          </p>
                        </div>
                      </div>
                      <div className="p-5 bg-gray-50/80 rounded-xl border border-gray-100 text-sm text-gray-600">
                        <p className="font-semibold mb-3 text-gray-700">信度评价标准</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg border border-emerald-100">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            <span className="text-xs">α ≥ 0.9：信度极好</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-xs">0.8 ≤ α &lt; 0.9：良好</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                            <span className="text-xs">0.7 ≤ α &lt; 0.8：可接受</span>
                          </div>
                          <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg border border-red-100">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            <span className="text-xs">α &lt; 0.7：需改进</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {(activeTab === 'difficulty' || activeTab === 'discrimination') && (
                <Card className="mt-6 border-gray-100 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-semibold">题目数据明细</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 bg-gray-50/50">
                            <th className="text-left py-3 px-4 font-medium text-gray-500">题目</th>
                            {activeTab === 'difficulty' && (
                              <>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">难度系数</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">平均分</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">满分</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">评价</th>
                              </>
                            )}
                            {activeTab === 'discrimination' && (
                              <>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">区分度</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">高分组均分</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">低分组均分</th>
                                <th className="text-left py-3 px-4 font-medium text-gray-500">评价</th>
                              </>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {(activeTab === 'difficulty' ? difficultyData : discriminationData).map((item: any) => (
                            <tr key={item.question} className="border-b border-gray-100 hover:bg-gray-50">
                              <td className="py-3.5 px-4 font-medium text-gray-800">{item.question}</td>
                              {activeTab === 'difficulty' && (
                                <>
                                  <td className="py-3 px-4">{item.difficulty?.toFixed(4)}</td>
                                  <td className="py-3 px-4">{item.mean_score}</td>
                                  <td className="py-3 px-4">{item.max_score}</td>
                                  <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      item.difficulty >= 0.7
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : item.difficulty >= 0.4
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-red-50 text-red-600'
                                    }`}>
                                      {item.level}
                                    </span>
                                  </td>
                                </>
                              )}
                              {activeTab === 'discrimination' && (
                                <>
                                  <td className="py-3 px-4">{item.discrimination?.toFixed(4)}</td>
                                  <td className="py-3 px-4">{item.high_group_mean}</td>
                                  <td className="py-3 px-4">{item.low_group_mean}</td>
                                  <td className="py-3 px-4">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                                      item.discrimination >= 0.4
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : item.discrimination >= 0.3
                                        ? 'bg-blue-50 text-blue-600'
                                        : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {item.level}
                                    </span>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
