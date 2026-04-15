import { useState } from 'react'
import {
  FileCheck,
  AlertCircle,
  CheckCircle2,
  Type,
  ListOrdered,
  Download,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import FileUpload from '@/components/FileUpload'
import RichEditor, { type ProofreadError } from '@/components/RichEditor'
import { proofreadApi } from '@/services/api'

const errorTypeConfig = {
  typo: { label: '错别字', color: 'text-red-600', bg: 'bg-red-50', borderColor: 'border-red-100', icon: Type },
  grammar: { label: '语法错误', color: 'text-amber-600', bg: 'bg-amber-50', borderColor: 'border-amber-100', icon: AlertCircle },
  format: { label: '格式问题', color: 'text-blue-600', bg: 'bg-blue-50', borderColor: 'border-blue-100', icon: ListOrdered },
}

export default function Proofread() {
  const [text, setText] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [errors, setErrors] = useState<ProofreadError[]>([])
  const [hasChecked, setHasChecked] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isFallback, setIsFallback] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])

  const handleCheck = async () => {
    if (!text.trim() && uploadedFiles.length === 0) return
    setIsChecking(true)
    setErrorMessage('')
    setIsFallback(false)

    try {
      let result: any

      if (uploadedFiles.length > 0) {
        result = await proofreadApi.uploadAndCheck(uploadedFiles[0])
      } else {
        result = await proofreadApi.check(text)
      }

      const data = result.data || result
      setErrors(data.errors || [])
      setIsFallback(data.fallback || false)

      if (data.text && !text) {
        setText(data.text)
      }

      setHasChecked(true)
    } catch (err: any) {
      const message = err.response?.data?.detail || err.message || '校对请求失败，请稍后重试'
      setErrorMessage(message)
    } finally {
      setIsChecking(false)
    }
  }

  const handleReset = () => {
    setText('')
    setErrors([])
    setHasChecked(false)
    setErrorMessage('')
    setIsFallback(false)
    setUploadedFiles([])
  }

  const handleAcceptSuggestion = (error: ProofreadError) => {
    setErrors((prev) => prev.filter((e) => e.id !== error.id))
    setText((prev) => prev.replace(error.original, error.suggestion))
  }

  const errorCounts = {
    typo: errors.filter((e) => e.type === 'typo').length,
    grammar: errors.filter((e) => e.type === 'grammar').length,
    format: errors.filter((e) => e.type === 'format').length,
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <FileCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">文本校对</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              AI 智能检测错别字、语法错误，检查题号和选项格式
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <Sparkles className="h-3.5 w-3.5" />
          <span className="font-medium">DeepSeek 驱动</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左侧：文本输入区 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">文本输入</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入或粘贴需要校对的试卷题目、答案文本..."
                className="w-full h-64 p-5 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm leading-relaxed bg-gray-50/50 placeholder:text-gray-400 transition-all"
              />
              <FileUpload
                accept={{
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                  'application/pdf': ['.pdf'],
                  'text/plain': ['.txt'],
                }}
                maxFiles={1}
                description="或拖拽 Word/PDF/TXT 文件到此处"
                onFilesChange={setUploadedFiles}
              />
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleCheck}
                  disabled={(!text.trim() && uploadedFiles.length === 0) || isChecking}
                  className="gap-2 h-10 px-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-md shadow-emerald-500/20"
                >
                  {isChecking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck className="h-4 w-4" />
                  )}
                  {isChecking ? '校对中...' : '开始校对'}
                </Button>
                <Button variant="outline" onClick={handleReset} className="gap-2 h-10 border-gray-200">
                  <RotateCcw className="h-4 w-4" />
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {errorMessage && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 降级提示 */}
          {isFallback && (
            <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
              <span>Dify 服务不可用，仅执行了基础格式检查。完整校对功能需要启动 Dify 服务。</span>
            </div>
          )}

          {/* 标注展示区 */}
          {hasChecked && (
            <Card className="border-gray-100 shadow-sm animate-fade-in-up">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">校对结果</CardTitle>
                  {errors.length > 0 && (
                    <span className="text-xs text-gray-400">点击高亮文本查看详情</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {errors.length === 0 ? (
                  <div className="p-8 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-4">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                    </div>
                    <span className="text-emerald-700 font-medium">未发现错误，文本质量良好！</span>
                    <span className="text-xs text-emerald-500 mt-1">所有检查项均已通过</span>
                  </div>
                ) : (
                  <RichEditor
                    content={text}
                    errors={errors}
                    onAcceptSuggestion={handleAcceptSuggestion}
                    editable={false}
                  />
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：错误列表面板 */}
        <div className="space-y-6">
          {/* 统计卡片 */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">错误统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(errorTypeConfig).map(([key, config]) => (
                  <div key={key} className={`${config.bg} border ${config.borderColor} rounded-xl p-4 text-center transition-all hover:scale-[1.02]`}>
                    <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center mx-auto mb-2`}>
                      <config.icon className={`h-4.5 w-4.5 ${config.color}`} />
                    </div>
                    <div className={`text-2xl font-bold ${config.color}`}>
                      {errorCounts[key as keyof typeof errorCounts]}
                    </div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{config.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 错误详情列表 */}
          <Card className="border-gray-100 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">错误详情</CardTitle>
                {errors.length > 0 && (
                  <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-gray-400 hover:text-gray-600 h-8">
                    <Download className="h-3.5 w-3.5" />
                    导出
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {errors.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <FileCheck className="h-6 w-6 text-gray-300" />
                  </div>
                  <p className="text-sm text-gray-400">
                    {hasChecked ? '未发现错误' : '请先输入文本并开始校对'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {errors.map((error) => {
                    const config = errorTypeConfig[error.type]
                    return (
                      <div
                        key={error.id}
                        className="p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-[11px] px-2 py-0.5 rounded-md ${config.bg} ${config.color} font-semibold border ${config.borderColor}`}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 leading-relaxed">{error.description}</p>
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="line-through text-red-400 bg-red-50 px-1.5 py-0.5 rounded">{error.original}</span>
                            <span className="text-gray-300">→</span>
                            <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">{error.suggestion}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-7 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleAcceptSuggestion(error)}
                          >
                            采纳
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
