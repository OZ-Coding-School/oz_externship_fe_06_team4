import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import {
  ChevronDown, 
} from 'lucide-react'
import {
  UndoIcon,
  RedoIcon,
  ToolbarBoldIcon,
  ToolbarItalicIcon,
  ToolbarUnderlineIcon,
  ToolbarStrikeIcon,
  ToolbarColorBoxIcon,
  ToolbarTextIcon, 
  ToolbarLinkIcon,
  ToolbarImageIcon,
  ToolbarEraserIcon,
  ToolbarArrowIcon,
  // New Bottom Row Icons
  ToolbarListGroupIcon,
  ToolbarAlignLeftIcon,
  ToolbarAlignCenterIcon,
  ToolbarAlignRightIcon,
  ToolbarAlignJustifyIcon,
  ToolbarLineHeightIcon,
  ToolbarOutdentIcon,
  ToolbarIndentIcon
} from '../../components/icons/CustomIcons'

import { api, createCommunityPost, getAccessToken } from '../../api/api'
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
  

  return {
    value: newValue,
    newSelectionStart: cursorInfo?.newStart ?? start + text.length,
    newSelectionEnd: cursorInfo?.newEnd ?? start + text.length,
  }
}


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
  const [textColorOpen, setTextColorOpen] = useState(false)
  const [currentFontSize, setCurrentFontSize] = useState('16')
  const [currentTextColor, setCurrentTextColor] = useState('')

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fontSizeRef = useRef<HTMLDivElement>(null)
  const textColorRef = useRef<HTMLDivElement>(null)
  

  const [historyStack, setHistoryStack] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)


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


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setFontSizeOpen(false)
      }
      if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
        setTextColorOpen(false)
      }
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

  // A. Inline Styles
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
  // handleInlineCode removed as it is not used in the current UI design
  
  // F. Font Size / Color
  const handleFontSize = (size: string) => {
    setCurrentFontSize(size)
    toggleWrapper(`<span style="font-size:${size}px">`, '</span>', 'Text')
    setFontSizeOpen(false)
  }

  const handleTextColor = (color: string) => {
    setCurrentTextColor(color)
    toggleWrapper(`<span style="color:${color}">`, '</span>', 'Color Text')
    setTextColorOpen(false)
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
  const handleOrderedList = () => toggleLinePrefix('1. ')
  
  // D. Align (HTML Wrap)
  const handleAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    toggleWrapper(`<div align="${align}">`, '</div>', 'Content')
  }

  const handleLineHeight = () => {
    const height = window.prompt('행간을 입력하세요 (예: 1.5, 200%)', '1.5')
    if (!height) return
    toggleWrapper(`<div style="line-height:${height}">`, '</div>', 'Line Height Content')
  }

  // Use toggleLinePrefix logic but specialized for adding/removing
  const handleIndent = () => toggleLinePrefix('> ') // Increases indentation (Blockquote level)
  
  const handleOutdent = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end, value } = getSelectionInfo(textarea)
    let lineStart = value.lastIndexOf('\n', start - 1) + 1
    let lineEnd = value.indexOf('\n', end)
    if (lineEnd === -1) lineEnd = value.length

    const linesContent = value.substring(lineStart, lineEnd)
    const lines = linesContent.split('\n')
    
    const newLines = lines.map(line => {
      // Remove one level of blockquote or indentation
      if (line.startsWith('> ')) return line.substring(2)
      if (line.startsWith('>')) return line.substring(1)
      if (line.startsWith('  ')) return line.substring(2) // Remove spaces if present
      return line
    })
    
    const newText = newLines.join('\n')
    const res = replaceInfo(textarea, newText, lineStart, lineEnd)
    updateContent(res.value)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newText.length)
    }, 0)
  }

  const handleEraser = () => {
    applyParams((sel) => {
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
      const token = getAccessToken()
      const data = await createCommunityPost({
        category_id: categoryId,
        title,
        content,
      }, token || undefined)
      
      alert('게시글이 등록되었습니다.')
      navigate(`/community/${data.pk}`)
    } catch (error) {
      console.error('게시글 등록 실패:', error)
      alert('게시글 등록에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex w-full items-center justify-center py-[52px]">
      <div className="flex w-[944px] flex-col items-end gap-[52px]">
        {/* Hidden File Input */}
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

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
                      <option value="" disabled>카테고리 선택</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
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
            <div className="sticky top-0 z-20 flex flex-col items-center justify-center border-b border-[#E5E7EB] bg-white px-8 py-4 shadow-sm gap-4">
              
              {/* TOP ROW */}
              <div className="flex w-full items-center justify-center gap-6">
                {/* Undo/Redo */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleUndo} className="p-1 hover:bg-gray-100 rounded">
                    <UndoIcon />
                  </button>
                  <button type="button" onClick={handleRedo} className="p-1 hover:bg-gray-100 rounded">
                    <RedoIcon />
                  </button>
                </div>

                <div className="h-6 w-px bg-[#E5E7EB]" />

                {/* Font Controls */}
                <div className="flex items-center gap-2">
                   <button type="button" className="flex h-8 items-center gap-2 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] cursor-not-allowed opacity-70" disabled>
                     기본서체
                     <ChevronDown className="h-4 w-4" />
                   </button>
                   
                   <div className="relative" ref={fontSizeRef}>
                     <button type="button" onClick={() => setFontSizeOpen(!fontSizeOpen)} className="flex h-8 items-center gap-2 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] hover:bg-gray-200">
                       {currentFontSize}
                       <ChevronDown className="h-4 w-4" />
                     </button>
                     {fontSizeOpen && (
                       <div className="absolute top-full left-0 mt-1 w-20 rounded border border-gray-200 bg-white shadow-lg py-1 z-30">
                         {['12', '14', '16', '18', '24', '32'].map(size => (
                           <button key={size} className="block w-full px-4 py-1 text-left text-sm hover:bg-gray-100" onClick={() => handleFontSize(size)}>
                             {size}
                           </button>
                         ))}
                       </div>
                     )}
                   </div>
                </div>

                <div className="h-6 w-px bg-[#E5E7EB]" />

                {/* Formatting: B, I, U, S, ColorBox, Arrow, A */}
                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleBold} className="p-1 hover:bg-gray-100 rounded"><ToolbarBoldIcon /></button>
                  <button type="button" onClick={handleItalic} className="p-1 hover:bg-gray-100 rounded"><ToolbarItalicIcon /></button>
                  <button type="button" onClick={handleUnderline} className="p-1 hover:bg-gray-100 rounded"><ToolbarUnderlineIcon /></button>
                  <button type="button" onClick={handleStrikethrough} className="p-1 hover:bg-gray-100 rounded"><ToolbarStrikeIcon /></button>
                  
                  {/* Color Picker Group (Box + Arrow + A) */}
                  <div className="relative flex items-center gap-1" ref={textColorRef}>
                    <button type="button" onClick={() => setTextColorOpen(!textColorOpen)} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarColorBoxIcon selectedColor={currentTextColor} />
                    </button>
                    {/* Arrow Icon from SVG Set */}
                    <button type="button" onClick={() => setTextColorOpen(!textColorOpen)} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarArrowIcon />
                    </button>
                    
                    <button type="button" onClick={handleUnderline} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarTextIcon />
                    </button>
                    
                    {textColorOpen && (
                      <div className="absolute top-full left-0 mt-1 w-32 rounded border border-gray-200 bg-white shadow-lg p-2 z-30 grid grid-cols-4 gap-2">
                         {['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#A52A2A', '#808080'].map(c => (
                           <div key={c} className="w-6 h-6 rounded-full cursor-pointer border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => handleTextColor(c)} />
                         ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-6 w-px bg-[#E5E7EB]" />

                {/* Insert: Link, Image */}
                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleLink} className="p-1 hover:bg-gray-100 rounded">
                     <ToolbarLinkIcon />
                  </button>
                  <button type="button" onClick={handleImageClick} className="p-1 hover:bg-gray-100 rounded">
                     <ToolbarImageIcon />
                  </button>
                </div>
              </div>

              {/* BOTTOM ROW */}
              <div className="flex w-full items-center justify-center gap-6 border-t border-[#F3F4F6] pt-3">
                 {/* List */}
                 <button type="button" onClick={handleUnorderedList} className="p-1 hover:bg-gray-100 rounded">
                   <ToolbarListGroupIcon />
                 </button>
                 
                 {/* Align */}
                 <div className="flex items-center gap-2">
                   <button type="button" onClick={() => handleAlign('left')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignLeftIcon /></button>
                   <button type="button" onClick={() => handleAlign('center')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignCenterIcon /></button>
                   <button type="button" onClick={() => handleAlign('right')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignRightIcon /></button>
                   <button type="button" onClick={() => handleAlign('justify')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignJustifyIcon /></button>
                 </div>

                 {/* Misc: LineHeight, Outdent, Indent */}
                 <div className="flex items-center gap-2">
                    <button type="button" onClick={handleLineHeight} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarLineHeightIcon />
                    </button>
                    <button type="button" onClick={handleOutdent} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarOutdentIcon />
                    </button>
                    <button type="button" onClick={handleIndent} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarIndentIcon />
                    </button>
                 </div>

                 {/* Eraser */}
                 <div className="flex items-center gap-1">
                   <button type="button" onClick={handleEraser} className="p-1 hover:bg-gray-100 rounded">
                     <ToolbarEraserIcon />
                   </button>
                 </div>
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
                       span: ({node, ...props}) => <span {...props} />,
                       div: ({node, ...props}) => <div {...props} />,
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
