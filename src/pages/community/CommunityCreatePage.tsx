import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Baseline,
  Highlighter,
  Eraser,
  ChevronDown,
} from 'lucide-react'
import { api } from '../../api/api'
import type { CommunityCategory, CreateCommunityPostResponse } from '../../types'

// ----------------------------------------------------------------------
// Utils for Textarea Manipulation
// ----------------------------------------------------------------------
function getSelectionInfo(textarea: HTMLTextAreaElement) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const selectedText = value.substring(start, end)
  return { start, end, value, selectedText }
}

function replaceInfo(
  textarea: HTMLTextAreaElement,
  text: string,
  start: number,
  end: number,
  cursorInfo?: { newStart?: number; newEnd?: number }
) {
  const original = textarea.value
  const newValue = original.substring(0, start) + text + original.substring(end)
  
  // Set value (React controlled input needs state update, but we do this via returned value)
  
  // Return info to update state
  return {
    value: newValue,
    newSelectionStart: cursorInfo?.newStart ?? start + text.length,
    newSelectionEnd: cursorInfo?.newEnd ?? start + text.length,
  }
}

// ----------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------

export default function CommunityCreatePage() {
  const navigate = useNavigate()
  
  // --- Data States ---
  const [categories, setCategories] = useState<CommunityCategory[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // --- UI States ---
  const [fontSizeOpen, setFontSizeOpen] = useState(false)
  const [fontFamilyOpen, setFontFamilyOpen] = useState(false)
  const [currentFontSize, setCurrentFontSize] = useState('16')

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fontSizeRef = useRef<HTMLDivElement>(null)
  
  // --- History for Undo/Redo ---
  // historyStack[historyIndex] = currentContent
  const [historyStack, setHistoryStack] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)

  // --- Initial Data Fetch ---
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await api.get<CommunityCategory[]>('/api/v1/posts/categories')
        setCategories(res.data)
      } catch (error) {
        console.error('카테고리 불러오기 실패:', error)
      }
    }
    fetchCategories()
  }, [])

  // --- Click Outside Handler for Dropdowns ---
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setFontSizeOpen(false)
      }
      // Add other dropdown refs if needed
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- Image Object URLs Cleanup ---
  // Store created object URLs to revoke them on unmount
  const objectUrlsRef = useRef<string[]>([])
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [])

  // --- History Management Methods ---
  const pushToHistory = useCallback((newContent: string) => {
    if (newContent === historyStack[historyIndex]) return // No change

    const newHistory = historyStack.slice(0, historyIndex + 1)
    newHistory.push(newContent)
    
    // Limit history size if needed (e.g., max 50)
    if (newHistory.length > 50) {
      newHistory.shift()
    }
    
    setHistoryStack(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [historyStack, historyIndex])

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevContent = historyStack[historyIndex - 1]
      setHistoryIndex(historyIndex - 1)
      setContent(prevContent)
    }
  }

  const handleRedo = () => {
    if (historyIndex < historyStack.length - 1) {
      const nextContent = historyStack[historyIndex + 1]
      setHistoryIndex(historyIndex + 1)
      setContent(nextContent)
    }
  }

  // --- Content Change Handler ---
  // Called by textarea onChange or toolbar actions
  const updateContent = (newContent: string, saveToHistory = true) => {
    setContent(newContent)
    if (saveToHistory) {
      pushToHistory(newContent)
    }
  }

  // Wrapper to simplify toolbar actions
  // Applies a transformation function to the current selection
  const applyParams = (
    transform: (sel: string, all: string, start: number, end: number) => { text: string; cursorOffset?: number; selectLength?: number }
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end, selectedText } = getSelectionInfo(textarea)
    const { text, cursorOffset, selectLength } = transform(selectedText, textarea.value, start, end)

    const result = replaceInfo(textarea, text, start, end)
    
    // Update content and history
    updateContent(result.value, true)

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus()
      const newCursorStart = start + (cursorOffset ?? text.length)
      const newCursorEnd = selectLength !== undefined ? newCursorStart + selectLength : newCursorStart
      textarea.selectionStart = newCursorStart
      textarea.selectionEnd = newCursorEnd
    }, 0)
  }

  // --- Toolbar Handlers ---

  // A. 인라인 스타일
  const toggleWrapper = (prefix: string, suffix: string, placeholder = 'text') => {
    applyParams((sel) => {
      
      if (sel.startsWith(prefix) && sel.endsWith(suffix)) {
        return { 
          text: sel.slice(prefix.length, -suffix.length),
          selectLength: sel.length - prefix.length - suffix.length,
          cursorOffset: 0
        }
      }
      
      const content = sel || placeholder
      return { 
        text: `${prefix}${content}${suffix}`, 
        selectLength: content.length,
        cursorOffset: prefix.length 
      }
    })
  }

  const handleBold = () => toggleWrapper('**', '**', 'Bold text')
  const handleItalic = () => toggleWrapper('*', '*', 'Italic text')
  const handleUnderline = () => toggleWrapper('<u>', '</u>', 'Underlined text')
  const handleStrikethrough = () => toggleWrapper('~~', '~~', 'Strikethrough text')
  const handleHighlight = () => toggleWrapper('<mark>', '</mark>', 'Highlighted text')
  const handleInlineCode = () => toggleWrapper('`', '`', 'code')
  
  // F. Font Size / Family
  const handleFontSize = (size: string) => {
    setCurrentFontSize(size)
    toggleWrapper(`<span style="font-size:${size}px">`, '</span>', 'Text')
    setFontSizeOpen(false)
  }
  
  // B. Link
  const handleLink = () => {
    const url = window.prompt('URL을 입력하세요:', 'https://')
    if (!url) return
    
    applyParams((sel) => {
      const text = sel || 'Link text'
      return { 
        text: `[${text}](${url})`, 
        selectLength: text.length, // Select the text part
        cursorOffset: 1 // Cursor at start of text
      }
    })
  }

  // C. Image
  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Create Object URL for preview
    const url = URL.createObjectURL(file)
    objectUrlsRef.current.push(url)

    // Insert Image Markdown
    applyParams(() => {
      const alt = file.name
      return {
        text: `![${alt}](${url})`,
        cursorOffset: 0,
        selectLength: 0
      }
    })
    
    // Reset input
    e.target.value = ''
  }

  // D. Lists (Handle multiline)
  const toggleLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end, value } = getSelectionInfo(textarea)
    
    // Find start and end of lines that contain selection
    let lineStart = value.lastIndexOf('\n', start - 1) + 1
    let lineEnd = value.indexOf('\n', end)
    if (lineEnd === -1) lineEnd = value.length

    const linesContent = value.substring(lineStart, lineEnd)
    const lines = linesContent.split('\n')
    
    const newLines = lines.map(line => {
      if (line.startsWith(prefix)) {
        return line.substring(prefix.length)
      } else {
        return prefix + line
      }
    })
    
    const newText = newLines.join('\n')
    
    replaceInfo(textarea, newText, lineStart, lineEnd)
    const res = replaceInfo(textarea, newText, lineStart, lineEnd)
    updateContent(res.value)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newText.length)
    }, 0)
  }

  const handleUnorderedList = () => toggleLinePrefix('- ')
  // For ordered list, we could do 1. 2. 3. logic but simpler is just 1. for all
  const handleOrderedList = () => toggleLinePrefix('1. ')
  
  // D. Align (HTML Wrap)
  const handleAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    toggleWrapper(`<div align="${align}">`, '</div>', 'Content')
  }

  const handleEraser = () => {
    // Clear formatting ?? Hard to do perfectly in markdown/html mix without parsing.
    // Simple implementation: Just delete selection content :P -> No, user expects style removal.
    // Let's just reset selection to plain text if possible.
    // For now, let's make it clear selection content.
    // Or better, just alert limitation or try to strip tags (too complex for regex).
    // Let's implement plain text replacement.
    applyParams((sel) => {
      // Very naiive strip tags
      const stripped = sel.replace(/<[^>]*>|[*_~`]/g, '')
      return { text: stripped }
    })
  }

  // --- Submit ---
  const handleSubmit = async () => {
    if (categoryId === null) {
      alert('카테고리를 선택해주세요.')
      return
    }
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }
    if (!content.trim()) {
      alert('내용을 입력해주세요.')
      return
    }

    try {
      setIsLoading(true)
      const res = await api.post<CreateCommunityPostResponse>('/api/v1/posts', {
        category_id: categoryId,
        title,
        content,
      })
      alert('게시글이 등록되었습니다.')
      if (res.data && res.data.pk) {
        navigate(`/community/${res.data.pk}`)
      } else {
        navigate('/community')
      }
    } catch (error) {
      console.error('게시글 등록 실패:', error)
      alert('게시글 등록 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full items-center justify-center py-[52px]">
      <div className="flex w-[944px] flex-col items-end gap-[52px]">
        
        {/* Hidden File Input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Header */}
        <div className="flex w-full flex-col items-start gap-5">
          <div className="flex w-full flex-col items-start gap-10">
            <div className="flex w-full flex-col items-start gap-5">
              <h1 className="font-['Pretendard'] text-[32px] font-bold tracking-[-0.64px] text-[#111111]">
                커뮤니티 게시글 작성
              </h1>
              <div className="h-px w-full bg-[#E5E7EB]" />
            </div>

            <div className="flex w-full flex-col items-start gap-2.5 rounded-[20px] border border-[#E5E7EB] px-[38px] py-10">
              <div className="flex w-full flex-col items-start gap-5">
                {/* Category Select */}
                <div className="flex w-full flex-col items-start gap-3">
                  <div className="relative flex h-10 w-full items-center justify-between rounded border border-[#D1D5DB] bg-white px-4">
                    <select
                      value={categoryId ?? ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setCategoryId(val === '' ? null : Number(val))
                      }}
                      className="z-10 h-full w-full cursor-pointer appearance-none bg-transparent text-sm text-[#374151] outline-none"
                    >
                      <option value="" disabled>
                        카테고리 선택
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 h-4 w-4 text-[#6B7280]" />
                  </div>
                </div>

                {/* Title Input */}
                <div className="flex h-[60px] w-full items-center rounded bg-primary-50 px-4">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="제목을 입력해 주세요"
                    className="w-full bg-transparent text-lg font-medium text-[#111827] outline-none placeholder:text-[#9CA3AF]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Editor Area */}
        <div className="flex w-full flex-col items-end gap-[52px]">
          <div className="flex w-full flex-col overflow-visible rounded-[20px] border border-[#E5E7EB]">
            {/* Toolbar */}
            <div className="sticky top-0 z-20 flex flex-wrap items-center justify-center gap-9 border-b border-[#E5E7EB] bg-white px-8 py-4 shadow-sm">
              
              {/* Undo/Redo */}
              <div className="flex items-center gap-7">
                <button type="button" onClick={handleUndo} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]">
                  <Undo className="h-6 w-6" />
                </button>
                <button type="button" onClick={handleRedo} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]">
                  <Redo className="h-6 w-6" />
                </button>
              </div>

              <div className="h-7 w-px bg-[#E5E7EB]" />

              {/* Font Controls */}
              <div className="flex items-center gap-7">
                <div className="flex items-center gap-3">
                  {/* Font Family (Visual Only) */}
                  <button
                    type="button"
                    className="flex h-6 items-center gap-3 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] cursor-not-allowed opacity-70"
                    disabled
                  >
                    기본서체
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {/* Font Size Dropdown */}
                  <div className="relative" ref={fontSizeRef}>
                    <button
                      type="button"
                      onClick={() => setFontSizeOpen(!fontSizeOpen)}
                      className="flex h-6 items-center gap-3 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] hover:bg-gray-200"
                    >
                      {currentFontSize}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {fontSizeOpen && (
                      <div className="absolute top-full left-0 mt-1 w-20 rounded border border-gray-200 bg-white shadow-lg py-1 z-30">
                        {['12', '14', '16', '18', '24', '32'].map(size => (
                          <button
                            key={size}
                            className="block w-full px-4 py-1 text-left text-sm hover:bg-gray-100"
                            onClick={() => handleFontSize(size)}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="h-7 w-px bg-[#E5E7EB]" />

              {/* Styles */}
              <div className="flex items-center gap-7">
                <button type="button" onClick={handleBold} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Bold className="h-6 w-6" /></button>
                <button type="button" onClick={handleItalic} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Italic className="h-6 w-6" /></button>
                <button type="button" onClick={handleUnderline} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Underline className="h-6 w-6" /></button>
                <button type="button" onClick={handleStrikethrough} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Strikethrough className="h-6 w-6" /></button>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleHighlight} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Highlighter className="h-6 w-6" /></button>
                </div>
                <button type="button" onClick={handleInlineCode} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Baseline className="h-6 w-6" /></button>
              </div>

              <div className="h-7 w-px bg-[#E5E7EB]" />

              {/* Insert */}
              <div className="flex items-center gap-7">
                <button type="button" onClick={handleLink} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Link className="h-6 w-6" /></button>
                <button type="button" onClick={handleImageClick} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><ImageIcon className="h-6 w-6" /></button>
              </div>

              <div className="h-7 w-px bg-[#E5E7EB]" />

              {/* Lists */}
              <div className="flex items-center gap-7">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleUnorderedList} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><List className="h-6 w-6" /></button>
                  <button type="button" onClick={handleOrderedList} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><ListOrdered className="h-6 w-6" /></button>
                </div>
              </div>

              <div className="flex items-center gap-7">
                <button type="button" onClick={() => handleAlign('left')} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><AlignLeft className="h-6 w-6" /></button>
                <button type="button" onClick={() => handleAlign('center')} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><AlignCenter className="h-6 w-6" /></button>
                <button type="button" onClick={() => handleAlign('right')} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><AlignRight className="h-6 w-6" /></button>
                <button type="button" onClick={() => handleAlign('justify')} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><AlignJustify className="h-6 w-6" /></button>
              </div>

              <div className="flex items-center gap-7">
                <button type="button" onClick={handleEraser} className="p-1 hover:bg-gray-100 rounded text-[#6B7280]"><Eraser className="h-6 w-6" /></button>
              </div>
            </div>

            {/* Split View */}
            <div className="grid w-full grid-cols-2 bg-[#E5E7EB] p-px gap-px">
              {/* Left: Editor */}
              <div className="flex h-full min-h-[600px] w-full flex-col bg-white p-6">
                <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Markdown Editor</div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => updateContent(e.target.value)}
                  className="flex-1 resize-none bg-transparent font-['Pretendard'] text-[14px] leading-relaxed text-black outline-none placeholder:text-gray-300"
                  placeholder={`# 제목

**굵은 글씨**와 *기울임 꼴*

> 인용문입니다.

1. 리스트 아이템 1
2. 리스트 아이템 2

이미지 버튼을 눌러 이미지를 추가해보세요.`}
                />
              </div>

              {/* Right: Preview */}
              <div className="flex h-full min-h-[600px] w-full flex-col bg-white p-6">
                <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</div>
                {/* prose class allows handy typography defaults if @tailwindcss/typography installed. 
                    If not, we style elements manually via components prop or global CSS.
                    Assuming standard tailwind here. */}
                <div className="prose prose-sm max-w-none flex-1 overflow-y-auto font-['Pretendard'] text-[14px] leading-relaxed text-black">
                   <ReactMarkdown 
                     remarkPlugins={[remarkGfm]}
                     rehypePlugins={[rehypeRaw]} // Enable HTML support
                     components={{
                       h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4 border-b pb-2" {...props} />,
                       h2: ({node, ...props}) => <h2 className="text-xl font-bold my-3" {...props} />,
                       h3: ({node, ...props}) => <h3 className="text-lg font-bold my-2" {...props} />,
                       ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 pl-2" {...props} />,
                       ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 pl-2" {...props} />,
                       blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-2 bg-gray-50 text-gray-600 italic" {...props} />,
                       a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                       img: ({node, ...props}) => <img className="max-w-full h-auto my-2 rounded shadow-sm" {...props} />,
                       code: ({node, ...props}) => <code className="bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm text-red-500" {...props} />,
                       pre: ({node, ...props}) => <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4" {...props} />,
                     }}
                   >
                     {content || '*미리보기가 여기에 표시됩니다.*'}
                   </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded bg-[#7C3AED] px-10 py-3 text-base font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:bg-gray-400"
        >
          {isLoading ? '등록 중...' : '등록하기'}
        </button>
      </div>
    </div>
  )
}
