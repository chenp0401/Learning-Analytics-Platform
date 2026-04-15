import { useState } from 'react'
import { Library, ExternalLink, RefreshCw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DifyKnowledge() {
  const [isLoading, setIsLoading] = useState(true)

  const difyUrl = '/apps'

  const handleIframeLoad = () => {
    setIsLoading(false)
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-12">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Library className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">文档库入口</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              管理知识库文档、配置 AI 工作流和应用
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 rounded-xl border-gray-200"
            onClick={() => {
              setIsLoading(true)
              const iframe = document.getElementById('dify-iframe') as HTMLIFrameElement
              if (iframe) {
                iframe.src = iframe.src
              }
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 rounded-xl border-gray-200"
            onClick={() => window.open(difyUrl, '_blank')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            新窗口打开
          </Button>
        </div>
      </div>

      {/* Dify iframe 容器 */}
      <div className="relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 220px)' }}>
        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
            </div>
            <p className="text-sm font-medium text-gray-600">正在加载文档库...</p>
            <p className="text-xs text-gray-400 mt-1">首次加载可能需要几秒钟</p>
          </div>
        )}

        <iframe
          id="dify-iframe"
          src={difyUrl}
          className="w-full h-full border-0"
          onLoad={handleIframeLoad}
          title="Dify 文档库"
          allow="clipboard-read; clipboard-write"
        />
      </div>
    </div>
  )
}
