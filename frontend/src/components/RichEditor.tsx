import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// 校对错误类型
export interface ProofreadError {
  id: number
  type: 'typo' | 'grammar' | 'format'
  position: { start: number; end: number }
  original: string
  suggestion: string
  description: string
}

interface RichEditorProps {
  content: string
  errors: ProofreadError[]
  onContentChange?: (content: string) => void
  onAcceptSuggestion?: (error: ProofreadError) => void
  editable?: boolean
  className?: string
}

// 错误类型对应的颜色配置
const errorColors: Record<string, { bg: string; border: string; text: string }> = {
  typo: { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-700' },
  grammar: { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-700' },
  format: { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-700' },
}

const errorTypeLabels: Record<string, string> = {
  typo: '错别字',
  grammar: '语法错误',
  format: '格式问题',
}

export default function RichEditor({
  content,
  errors,
  onContentChange,
  onAcceptSuggestion,
  editable = false,
  className = '',
}: RichEditorProps) {
  const [activeError, setActiveError] = useState<ProofreadError | null>(null)
  const [showBubble, setShowBubble] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
          class: 'proofread-highlight',
        },
      }),
      Placeholder.configure({
        placeholder: '请输入或粘贴需要校对的试卷题目、答案文本...',
      }),
    ],
    content: content || '',
    editable,
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getText())
    },
  })

  // 当内容变化时更新编辑器
  useEffect(() => {
    if (editor && content !== editor.getText()) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  // 应用错误高亮标注
  useEffect(() => {
    if (!editor || !errors.length) return

    // 先清除所有高亮
    editor.commands.unsetHighlight()

    // 构建带高亮标注的 HTML
    const htmlContent = buildHighlightedHtml(content, errors)
    editor.commands.setContent(htmlContent)
  }, [errors, editor])

  // 构建带高亮标注的 HTML
  const buildHighlightedHtml = (text: string, errs: ProofreadError[]): string => {
    if (!errs.length) return `<p>${escapeHtml(text)}</p>`

    // 按位置排序（从后往前替换，避免位置偏移）
    const sortedErrors = [...errs].sort((a, b) => b.position.start - a.position.start)

    let result = text
    for (const err of sortedErrors) {
      const { start, end } = err.position
      if (start >= 0 && end > start && end <= result.length) {
        const before = result.slice(0, start)
        const errorText = result.slice(start, end)
        const after = result.slice(end)

        const colorClass = err.type === 'typo'
          ? 'color: #dc2626; background-color: #fef2f2;'
          : err.type === 'grammar'
          ? 'color: #d97706; background-color: #fffbeb;'
          : 'color: #2563eb; background-color: #eff6ff;'

        result = `${before}<mark data-error-id="${err.id}" style="${colorClass} padding: 2px 4px; border-radius: 3px; cursor: pointer;" class="proofread-error">${escapeHtml(errorText)}</mark>${after}`
      }
    }

    // 将换行转为段落
    return result.split('\n').map(line => `<p>${line || '<br>'}</p>`).join('')
  }

  const escapeHtml = (text: string): string => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // 处理编辑器点击事件，检测是否点击了错误标注
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    const target = event.target as HTMLElement
    const errorMark = target.closest('.proofread-error') as HTMLElement

    if (errorMark) {
      const errorId = parseInt(errorMark.getAttribute('data-error-id') || '0')
      const error = errors.find(e => e.id === errorId)
      if (error) {
        setActiveError(error)
        setShowBubble(true)
        return
      }
    }

    setShowBubble(false)
    setActiveError(null)
  }, [errors])

  // 采纳建议
  const handleAcceptSuggestion = useCallback(() => {
    if (!activeError || !editor) return

    // 在编辑器中查找并替换错误文本
    const { state } = editor
    const { doc } = state
    let found = false

    doc.descendants((node, pos) => {
      if (found) return false
      if (node.isText && node.text) {
        const idx = node.text.indexOf(activeError.original)
        if (idx !== -1) {
          const from = pos + idx
          const to = from + activeError.original.length
          editor.chain()
            .focus()
            .deleteRange({ from, to })
            .insertContentAt(from, activeError.suggestion)
            .run()
          found = true
          return false
        }
      }
      return true
    })

    onAcceptSuggestion?.(activeError)
    setShowBubble(false)
    setActiveError(null)
  }, [activeError, editor, onAcceptSuggestion])

  if (!editor) return null

  return (
    <div className={`relative ${className}`}>
      {/* 编辑器主体 */}
      <div
        className="border border-gray-200 rounded-lg overflow-hidden"
        onClick={handleEditorClick}
      >
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-4 min-h-[200px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
        />
      </div>

      {/* 批注气泡 */}
      {showBubble && activeError && (
        <div className="absolute z-50 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 animate-in fade-in slide-in-from-top-2">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${errorColors[activeError.type]?.bg} ${errorColors[activeError.type]?.text}`}>
              {errorTypeLabels[activeError.type]}
            </span>
            <button
              onClick={() => { setShowBubble(false); setActiveError(null) }}
              className="p-0.5 rounded hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-gray-400" />
            </button>
          </div>

          {/* 错误描述 */}
          <p className="text-sm text-gray-600 mb-3">{activeError.description}</p>

          {/* 修改建议 */}
          <div className="flex items-center gap-2 text-sm mb-3 p-2 bg-gray-50 rounded">
            <span className="line-through text-red-400">{activeError.original}</span>
            <span className="text-gray-400">→</span>
            <span className="text-emerald-600 font-medium">{activeError.suggestion}</span>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleAcceptSuggestion}
              className="gap-1 text-xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              采纳建议
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowBubble(false); setActiveError(null) }}
              className="text-xs"
            >
              忽略
            </Button>
          </div>
        </div>
      )}

      {/* 错误统计条 */}
      {errors.length > 0 && (
        <div className="flex items-center gap-4 mt-2 px-1 text-xs text-gray-500">
          <span>共发现 <strong className="text-gray-700">{errors.length}</strong> 处问题</span>
          {errors.filter(e => e.type === 'typo').length > 0 && (
            <span className="text-red-600">
              错别字 {errors.filter(e => e.type === 'typo').length}
            </span>
          )}
          {errors.filter(e => e.type === 'grammar').length > 0 && (
            <span className="text-amber-600">
              语法 {errors.filter(e => e.type === 'grammar').length}
            </span>
          )}
          {errors.filter(e => e.type === 'format').length > 0 && (
            <span className="text-blue-600">
              格式 {errors.filter(e => e.type === 'format').length}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
