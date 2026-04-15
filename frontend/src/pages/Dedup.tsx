import { useState } from 'react'
import {
  FileSearch,
  Upload,
  Loader2,
  Eye,
  Filter,
  AlertTriangle,
  Copy,
  Sparkles,
  X,
  ShieldCheck,
  BarChart3,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FileUpload from '@/components/FileUpload'
import { dedupApi } from '@/services/api'

interface DedupResult {
  id: number
  fileName: string
  similarity: number
  type: 'exact' | 'semantic' | 'core'
  matchedDoc: string
  matchedContent: string
  uploadedContent: string
}

const typeConfig = {
  exact: { label: '完全一致', color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-100', icon: Copy },
  semantic: { label: '语义相似', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-100', icon: Sparkles },
  core: { label: '核心相同', color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-100', icon: ShieldCheck },
}

export default function Dedup() {
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<DedupResult[]>([])
  const [hasChecked, setHasChecked] = useState(false)
  const [selectedResult, setSelectedResult] = useState<DedupResult | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [errorMessage, setErrorMessage] = useState('')

  const handleCheck = async () => {
    if (uploadedFiles.length === 0) return
    setIsChecking(true)
    setErrorMessage('')

    try {
      const response: any = await dedupApi.check(uploadedFiles)
      const data = response.data || response
      setResults(data.results || [])
      setHasChecked(true)
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || '查重请求失败，请稍后重试'
      setErrorMessage(message)
    } finally {
      setIsChecking(false)
    }
  }

  const filteredResults =
    filterType === 'all' ? results : results.filter((r) => r.type === filterType)

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 80) return 'text-red-600'
    if (similarity >= 60) return 'text-amber-600'
    return 'text-blue-600'
  }

  const getSimilarityBg = (similarity: number) => {
    if (similarity >= 80) return 'bg-gradient-to-r from-red-500 to-rose-500'
    if (similarity >= 60) return 'bg-gradient-to-r from-amber-500 to-orange-500'
    return 'bg-gradient-to-r from-blue-500 to-indigo-500'
  }

  const getSimilarityRingColor = (similarity: number) => {
    if (similarity >= 80) return 'ring-red-100'
    if (similarity >= 60) return 'ring-amber-100'
    return 'ring-blue-100'
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <FileSearch className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">文档查重</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              与文档库 2 万份文件比对，三级策略检测重复内容
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full border border-violet-100">
          <BarChart3 className="h-3.5 w-3.5" />
          <span className="font-medium">文档库 20,000 份</span>
        </div>
      </div>

      {/* 上传区域 */}
      <Card className="mb-8 border-gray-100 shadow-sm">
        <CardContent className="pt-6 pb-6">
          <FileUpload
            accept={{
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
              'application/pdf': ['.pdf'],
            }}
            maxFiles={10}
            description="拖拽 Word 或 PDF 文件到此处进行查重"
            onFilesChange={setUploadedFiles}
          />
          <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              支持同时上传多个文件，系统将逐一与文档库进行比对
            </p>
            <Button
              onClick={handleCheck}
              disabled={uploadedFiles.length === 0 || isChecking}
              className="gap-2 h-10 px-6 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-md shadow-violet-500/20"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {isChecking ? '查重中...' : '开始查重'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误提示 */}
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 mb-8 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 查重结果 */}
      {hasChecked && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in-up">
          {/* 左侧：结果列表 */}
          <div className="lg:col-span-3">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    查重结果
                    <span className="ml-2 text-sm font-normal text-gray-400">
                      共 {results.length} 处匹配
                    </span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {filteredResults.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                      <ShieldCheck className="h-8 w-8 text-emerald-400" />
                    </div>
                    <p className="text-gray-500 font-medium">未发现重复内容</p>
                    <p className="text-xs text-gray-400 mt-1">文档内容具有良好的原创性</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredResults.map((result) => {
                      const config = typeConfig[result.type]
                      return (
                        <div
                          key={result.id}
                          className="p-5 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
                          onClick={() => setSelectedResult(result)}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-[11px] px-2.5 py-1 rounded-lg ${config.bg} ${config.color} font-semibold border ${config.borderColor}`}>
                                {config.label}
                              </span>
                              <span className="text-sm text-gray-700 font-medium">
                                {result.matchedDoc}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className={`text-xl font-bold ${getSimilarityColor(result.similarity)} ring-4 ${getSimilarityRingColor(result.similarity)} rounded-full w-14 h-14 flex items-center justify-center text-center`}>
                                <span className="text-base">{result.similarity}<span className="text-xs">%</span></span>
                              </div>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-4 w-4 text-gray-400" />
                              </Button>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${getSimilarityBg(result.similarity)} transition-all duration-500`}
                              style={{ width: `${result.similarity}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                            {result.matchedContent}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：筛选和统计 */}
          <div className="space-y-6">
            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  筛选
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {[
                    { key: 'all', label: '全部', count: results.length },
                    { key: 'exact', label: '完全一致', count: results.filter((r) => r.type === 'exact').length },
                    { key: 'semantic', label: '语义相似', count: results.filter((r) => r.type === 'semantic').length },
                    { key: 'core', label: '核心相同', count: results.filter((r) => r.type === 'core').length },
                  ].map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setFilterType(item.key)}
                      className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all ${
                        filterType === item.key
                          ? 'bg-violet-50 text-violet-700 font-medium border border-violet-100 shadow-sm'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        filterType === item.key ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-100 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">相似度分布</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { label: '≥80% 高度相似', color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-100', count: results.filter((r) => r.similarity >= 80).length },
                    { label: '60-79% 中度相似', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-100', count: results.filter((r) => r.similarity >= 60 && r.similarity < 80).length },
                    { label: '<60% 低度相似', color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-100', count: results.filter((r) => r.similarity < 60).length },
                  ].map((item) => (
                    <div key={item.label} className={`flex items-center justify-between text-sm p-3 rounded-xl ${item.bg} border ${item.borderColor}`}>
                      <span className={`${item.color} font-medium text-xs`}>{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* 对比详情弹窗 */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">内容对比详情</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  相似度 <span className={`font-bold ${getSimilarityColor(selectedResult.similarity)}`}>{selectedResult.similarity}%</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">上传文档</h4>
                <div className="p-5 bg-red-50/50 rounded-xl border border-red-100 text-sm leading-relaxed text-gray-700">
                  {selectedResult.uploadedContent}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  匹配文档 · {selectedResult.matchedDoc}
                </h4>
                <div className="p-5 bg-amber-50/50 rounded-xl border border-amber-100 text-sm leading-relaxed text-gray-700">
                  {selectedResult.matchedContent}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end">
              <Button variant="outline" onClick={() => setSelectedResult(null)} className="h-10 px-6 rounded-xl">
                关闭
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
