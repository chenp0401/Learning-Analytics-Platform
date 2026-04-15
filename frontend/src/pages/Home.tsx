import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  FileCheck,
  FileSearch,
  BarChart3,
  ArrowRight,
  Clock,
  Upload,
  Sparkles,
  TrendingUp,
  Zap,
  X,
  BookOpen,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const features = [
  {
    title: '文本校对',
    description: '自动检测试卷题目和答案中的错别字、语法错误，检查题号和选项格式',
    icon: FileCheck,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    gradientFrom: 'from-emerald-500',
    gradientTo: 'to-teal-600',
    borderColor: 'hover:border-emerald-200',
    link: '/proofread',
    stats: '已校对 1,234 份',
    badge: '智能 AI',
  },
  {
    title: '文档查重',
    description: '与文档库 2 万份文件比对，检测完全一致、语义相似和核心内容相同',
    icon: FileSearch,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    gradientFrom: 'from-violet-500',
    gradientTo: 'to-purple-600',
    borderColor: 'hover:border-violet-200',
    link: '/dedup',
    stats: '文档库 20,000 份',
    badge: '三级查重',
  },
  {
    title: '数据分析',
    description: '自动生成成绩分布图表，计算难度系数、区分度、信度和效度指标',
    icon: BarChart3,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-indigo-600',
    borderColor: 'hover:border-blue-200',
    link: '/analysis',
    stats: '已分析 56 场考试',
    badge: '可视化',
  },
]

const recentActivities = [
  { action: '校对完成', detail: '2024年期末考试数学试卷.docx', time: '10 分钟前', type: 'proofread' },
  { action: '查重完成', detail: '高三物理模拟题（三）.pdf', time: '1 小时前', type: 'dedup' },
  { action: '分析完成', detail: '高二年级期中考试成绩', time: '3 小时前', type: 'analysis' },
  { action: '校对完成', detail: '英语听力测试答案.docx', time: '昨天', type: 'proofread' },
]

const activityColors: Record<string, { bg: string; text: string }> = {
  proofread: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  dedup: { bg: 'bg-violet-50', text: 'text-violet-600' },
  analysis: { bg: 'bg-blue-50', text: 'text-blue-600' },
}

const quickStats = [
  { label: '本月校对', value: '128', unit: '份', icon: FileCheck, trend: '+12%' },
  { label: '本月查重', value: '56', unit: '份', icon: FileSearch, trend: '+8%' },
  { label: '本月分析', value: '23', unit: '场', icon: BarChart3, trend: '+15%' },
  { label: '节省时间', value: '46', unit: '小时', icon: Zap, trend: '' },
]

export default function Home() {
  const [showGuide, setShowGuide] = useState(false)
  const [showUploadMenu, setShowUploadMenu] = useState(false)
  const navigate = useNavigate()

  const uploadOptions = [
    {
      title: '文本校对',
      desc: '上传试卷文本进行校对',
      icon: FileCheck,
      color: 'from-emerald-500 to-teal-600',
      hoverBg: 'hover:bg-emerald-50',
      path: '/proofread',
    },
    {
      title: '文档查重',
      desc: '上传文档进行查重比对',
      icon: FileSearch,
      color: 'from-violet-500 to-purple-600',
      hoverBg: 'hover:bg-violet-50',
      path: '/dedup',
    },
    {
      title: '数据分析',
      desc: '上传成绩数据进行分析',
      icon: BarChart3,
      color: 'from-blue-500 to-indigo-600',
      hoverBg: 'hover:bg-blue-50',
      path: '/analysis',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* 欢迎区域 */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 rounded-2xl p-10 text-white">
        {/* 装饰背景 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
        <div className="absolute top-10 right-20 w-20 h-20 bg-white/10 rounded-2xl rotate-12"></div>
        <div className="absolute bottom-8 right-40 w-12 h-12 bg-white/10 rounded-xl -rotate-6"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span className="text-sm font-medium text-blue-200">AI 驱动的教育辅助工具</span>
          </div>
          <h1 className="text-4xl font-bold mb-3 leading-tight">
            欢迎使用教育辅助平台
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl leading-relaxed">
            集成文本校对、文档查重、数据分析三大核心功能，助力教育工作者高效处理试卷和成绩数据
          </p>
          <div className="flex gap-3 mt-8">
            <Button
              className="bg-white text-blue-700 hover:bg-blue-50 gap-2 h-11 px-6 font-semibold shadow-lg shadow-black/10"
              onClick={() => setShowUploadMenu(true)}
            >
              <Upload className="h-4 w-4" />
              快速上传
            </Button>
            <Button
              variant="ghost"
              className="text-white/90 hover:bg-white/15 hover:text-white gap-2 h-11 px-6 border border-white/20"
              onClick={() => setShowGuide(true)}
            >
              查看使用指南
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 快速统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="card-hover border-gray-100">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <stat.icon className="h-5 w-5 text-blue-600" />
                </div>
                {stat.trend && (
                  <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    {stat.trend}
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gray-900">{stat.value}</span>
                <span className="text-sm text-gray-400">{stat.unit}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 功能卡片 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">核心功能</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link key={feature.title} to={feature.link}>
              <Card className={`h-full card-hover border-gray-100 ${feature.borderColor} cursor-pointer group`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.gradientFrom} ${feature.gradientTo} flex items-center justify-center shadow-lg shadow-${feature.gradientFrom.replace('from-', '')}/20`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
                      {feature.badge}
                    </span>
                  </div>
                  <CardTitle className="text-lg group-hover:text-blue-700 transition-colors">{feature.title}</CardTitle>
                  <CardDescription className="leading-relaxed">{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs text-gray-400">{feature.stats}</span>
                    <div className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      进入
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* 最近活动 */}
      <Card className="border-gray-100">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
                <Clock className="h-4 w-4 text-gray-500" />
              </div>
              最近活动
            </CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-gray-400 hover:text-gray-600">
              查看全部
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recentActivities.map((activity, index) => {
              const colors = activityColors[activity.type] || activityColors.proofread
              return (
                <div
                  key={index}
                  className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors -mx-3"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg ${colors.bg} ${colors.text}`}>
                      {activity.action}
                    </span>
                    <span className="text-sm text-gray-700">{activity.detail}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
      {/* 快速上传弹窗 */}
      {showUploadMenu && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUploadMenu(false)
          }}
        >
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">快速上传</h3>
                  <p className="text-xs text-gray-400">选择上传目标功能</p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadMenu(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-3">
              {uploadOptions.map((option) => (
                <button
                  key={option.title}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-left transition-colors ${option.hoverBg} group`}
                  onClick={() => {
                    setShowUploadMenu(false)
                    navigate(option.path)
                  }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${option.color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                    <option.icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{option.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{option.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 使用指南弹窗 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">使用指南</h3>
                  <p className="text-xs text-gray-400">快速了解平台核心功能</p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {[
                {
                  step: '1',
                  title: '文本校对',
                  desc: '在「文本校对」页面，粘贴或上传试卷文本（支持 Word/PDF/TXT），点击「开始校对」，系统将自动检测错别字、语法错误和格式问题，并给出修改建议。',
                  color: 'from-emerald-500 to-teal-600',
                  icon: FileCheck,
                },
                {
                  step: '2',
                  title: '文档查重',
                  desc: '在「文档查重」页面，上传需要查重的 Word 或 PDF 文件，系统将与文档库中的 2 万份文件进行三级比对（完全一致、语义相似、核心内容相同），并展示详细的对比结果。',
                  color: 'from-violet-500 to-purple-600',
                  icon: FileSearch,
                },
                {
                  step: '3',
                  title: '数据分析',
                  desc: '在「数据分析」页面，上传 CSV 格式的考试成绩数据，系统将自动生成成绩分布图表，并计算每道题的难度系数、区分度以及整体信度（Cronbach\'s Alpha）。',
                  color: 'from-blue-500 to-indigo-600',
                  icon: BarChart3,
                },
                {
                  step: '4',
                  title: '文档库管理',
                  desc: '在「文档库入口」页面，可以访问 Dify 知识库管理控制台，上传和管理文档库中的文件，配置 AI 工作流和应用。首次使用需要登录 Dify 管理员账号。',
                  color: 'from-orange-500 to-amber-600',
                  icon: BookOpen,
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">
                      步骤 {item.step}：{item.title}
                    </h4>
                    <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <Button
                onClick={() => setShowGuide(false)}
                className="h-10 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              >
                我知道了
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
