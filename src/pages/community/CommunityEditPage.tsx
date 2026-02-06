import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  ToolbarListGroupIcon,
  ToolbarAlignLeftIcon,
  ToolbarAlignCenterIcon,
  ToolbarAlignRightIcon,
  ToolbarAlignJustifyIcon,
  ToolbarLineHeightIcon,
  ToolbarOutdentIcon,
  ToolbarIndentIcon
} from '../../components/icons/CustomIcons'

import { api, createCommunityPost, updateCommunityPost, getCommunityPostDetail, getAccessToken, getPresignedUrl, uploadToS3 } from '../../api/api'
import type { CommunityCategory } from '../../types'

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


export default function CommunityEditPage() {
  const navigate = useNavigate()
  const { postId } = useParams<{ postId?: string }>()
  const isEditMode = Boolean(postId)
  
  // --- Data ---
  const [categories, setCategories] = useState<CommunityCategory[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingPost, setIsLoadingPost] = useState(false)

  // --- UI ---
  const [isFontSizeMenuOpen, setIsFontSizeMenuOpen] = useState(false)
  const [isTextColorMenuOpen, setIsTextColorMenuOpen] = useState(false)
  const [isListMenuOpen, setIsListMenuOpen] = useState(false)
  const [currentFontSize, setCurrentFontSize] = useState('16')
  const [currentTextColor, setCurrentTextColor] = useState('')

  // --- Refs ---
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const fontSizeRef = useRef<HTMLDivElement>(null)
  const textColorRef = useRef<HTMLDivElement>(null)
  const listMenuRef = useRef<HTMLDivElement>(null)
  

  const [historyStack, setHistoryStack] = useState<string[]>([''])
  const [historyIndex, setHistoryIndex] = useState(0)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)


  // 카테고리 목록 불러오기
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

  // 수정 모드일 때 기존 게시글 데이터 불러오기
  useEffect(() => {
    async function fetchPostData() {
      if (!isEditMode || !postId) return
      
      try {
        setIsLoadingPost(true)
        const postData = await getCommunityPostDetail(Number(postId))
        
        setCategoryId(postData.category.id)
        setTitle(postData.title)
        setContent(postData.content)
        
        // 히스토리 스택도 초기화
        setHistoryStack([postData.content])
        setHistoryIndex(0)
      } catch (error) {
        console.error('게시글 로드 실패:', error)
        alert('게시글을 불러오는데 실패했습니다.')
        navigate('/community')
      } finally {
        setIsLoadingPost(false)
      }
    }
    
    fetchPostData()
  }, [isEditMode, postId, navigate])


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
        setIsFontSizeMenuOpen(false)
      }
      if (textColorRef.current && !textColorRef.current.contains(event.target as Node)) {
        setIsTextColorMenuOpen(false)
      }
      if (listMenuRef.current && !listMenuRef.current.contains(event.target as Node)) {
        setIsListMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


  const pushToHistory = useCallback((newContent: string) => {
    setHistoryStack(prevStack => {
      if (newContent === prevStack[historyIndex]) return prevStack
      const newHistory = prevStack.slice(0, historyIndex + 1)
      newHistory.push(newContent)
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prevIndex => Math.min(49, prevIndex + 1))
  }, [historyIndex])

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

  const updateContent = (newContent: string, saveToHistory = true, isKeystroke = false) => {
    setContent(newContent)
    if (saveToHistory) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      if (isKeystroke) {
        debounceTimerRef.current = setTimeout(() => pushToHistory(newContent), 500)
      } else {
        pushToHistory(newContent)
      }
    }
  }


  const applyParams = (
    transform: (sel: string, all: string, start: number, end: number) => { text: string; cursorOffset?: number; selectLength?: number }
  ) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end, selectedText } = getSelectionInfo(textarea)
    const { text, cursorOffset, selectLength } = transform(selectedText, textarea.value, start, end)

    const result = replaceInfo(textarea, text, start, end)
    

    updateContent(result.value, true)


    setTimeout(() => {
      textarea.focus()
      const newCursorStart = start + (cursorOffset ?? text.length)
      const newCursorEnd = selectLength !== undefined ? newCursorStart + selectLength : newCursorStart
      textarea.selectionStart = newCursorStart
      textarea.selectionEnd = newCursorEnd
    }, 0)
  }

  // --- 툴바  ---

  const toggleWrapper = (prefix: string, suffix: string, placeholder = 'text') => {
    applyParams((sel) => {
      const trimmed = sel.trim()
      const leading = sel.match(/^\s*/)?.[0] || ''
      const trailing = sel.match(/\s*$/)?.[0] || ''

      // 리스트 접두사가 포함된 경우 분리 처리
      const listMatch = trimmed.match(/^(\d+\.\s|- |> )/)
      if (listMatch) {
        const listPrefix = listMatch[0]
        const body = trimmed.slice(listPrefix.length)
        
        if (body.startsWith(prefix) && body.endsWith(suffix)) {
          const inner = body.slice(prefix.length, -suffix.length)
          return {
            text: leading + listPrefix + inner + trailing,
            selectLength: inner.length,
            cursorOffset: leading.length + listPrefix.length
          }
        }
        const content = body || placeholder
        return {
          text: leading + listPrefix + prefix + content + suffix + trailing,
          selectLength: content.length,
          cursorOffset: leading.length + listPrefix.length + prefix.length
        }
      }

      if (trimmed.startsWith(prefix) && trimmed.endsWith(suffix)) {
        const inner = trimmed.slice(prefix.length, -suffix.length)
        return { 
          text: leading + inner + trailing,
          selectLength: inner.length,
          cursorOffset: leading.length
        }
      }
      
      const content = trimmed || placeholder
      return { 
        text: leading + prefix + content + suffix + trailing, 
        selectLength: content.length,
        cursorOffset: leading.length + prefix.length 
      }
    })
  }

  const handleBold = () => toggleWrapper('**', '**', 'Bold text')
  const handleItalic = () => toggleWrapper('*', '*', 'Italic text')
  const handleUnderline = () => toggleWrapper('<u>', '</u>', 'Underlined text')
  const handleStrikethrough = () => toggleWrapper('~~', '~~', 'Strikethrough text')

  // 폰트사이즈 , 컬러 
  const handleFontSize = (size: string) => {
    setCurrentFontSize(size)
    toggleWrapper(`<span style="font-size:${size}px">`, '</span>', 'Text')
    setIsFontSizeMenuOpen(false)
  }

  const handleTextColor = (color: string) => {
    setCurrentTextColor(color)
    toggleWrapper(`<span style="color:${color}">`, '</span>', 'Color Text')
    setIsTextColorMenuOpen(false)
  }
  
  // 링크
  const handleLink = () => {
    const url = window.prompt('URL을 입력하세요:', 'https://')
    if (!url) return
    
    applyParams((sel) => {
      const text = sel || 'Link text'
      return { 
        text: `[${text}](${url})`, 
        selectLength: text.length,
        cursorOffset: 1 
      }
    })
  }

  // 이미지 - Presigned URL 방식
  const handleImageClick = () => {
    if (isUploading) {
      alert('이미지 업로드 중입니다. 잠시만 기다려주세요.')
      return
    }
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 파일 크기 체크 (10MB 제한)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      alert('파일 크기는 10MB를 초과할 수 없습니다.')
      e.target.value = ''
      return
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      e.target.value = ''
      return
    }

    try {
      setIsUploading(true)

      // 1. Presigned URL 요청
      const { presigned_url, img_url } = await getPresignedUrl(file.name)

      // 2. S3에 파일 업로드
      await uploadToS3(presigned_url, file)

      // 3. 마크다운에 이미지 URL 삽입
      applyParams(() => {
        const alt = file.name
        return {
          text: `![${alt}](${img_url})`,
          cursorOffset: 0,
          selectLength: 0
        }
      })
    } catch (error) {
      console.error('이미지 업로드 실패:', error)
      alert('이미지 업로드에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsUploading(false)
      e.target.value = ''
    }
  }


  const toggleLinePrefix = (pattern: string | RegExp, defaultPrefix?: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end, value } = getSelectionInfo(textarea)
    let lineStart = value.lastIndexOf('\n', start - 1) + 1
    let lineEnd = value.indexOf('\n', end)
    if (lineEnd === -1) lineEnd = value.length

    const linesContent = value.substring(lineStart, lineEnd)
    const lines = linesContent.split('\n')
    
    const newLines = lines.map(line => {
      if (pattern instanceof RegExp) {
        if (pattern.test(line)) {
          return line.replace(pattern, '')
        }
        return (defaultPrefix || '') + line
      } else {
        if (line.startsWith(pattern)) {
          return line.substring(pattern.length)
        }
        return pattern + line
      }
    })
    
    const newText = newLines.join('\n')
    
    const res = replaceInfo(textarea, newText, lineStart, lineEnd)
    updateContent(res.value)
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(lineStart, lineStart + newText.length)
    }, 0)
  }

  const handleOrderedList = () => {
    toggleLinePrefix(/^\d+\.\s/, '1. ')
    setIsListMenuOpen(false)
  }
  const handleUnorderedList = () => {
    toggleLinePrefix('- ')
    setIsListMenuOpen(false)
  }
  

  const handleAlign = (align: 'left' | 'center' | 'right' | 'justify') => {
    toggleWrapper(`<div align="${align}">`, '</div>', 'Content')
  }

  const handleLineHeight = () => {
    const height = window.prompt('행간을 입력하세요 (예: 1.5, 200%)', '1.5')
    if (!height) return
    toggleWrapper(`<div style="line-height:${height}">`, '</div>', 'Line Height Content')
  }

  const handleIndent = () => toggleLinePrefix('> ') 
  
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
 
      if (line.startsWith('> ')) return line.substring(2)
      if (line.startsWith('>')) return line.substring(1)
      if (line.startsWith('  ')) return line.substring(2) 
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
      
      if (isEditMode && postId) {
        // 수정 모드
        await updateCommunityPost(
          Number(postId),
          {
            category_id: categoryId,
            title,
            content,
          }
        )
        
        alert('게시글이 수정되었습니다.')
        navigate(`/community/${postId}`)
      } else {
        // 생성 모드
        const data = await createCommunityPost({
          category_id: categoryId,
          title,
          content,
        }, token || undefined)
        
        alert('게시글이 등록되었습니다.')
        navigate(`/community/${data.pk}`)
      }
    } catch (error) {
      console.error('게시글 처리 실패:', error)
      alert(isEditMode ? '게시글 수정에 실패했습니다.' : '게시글 등록에 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const { start, end, value } = getSelectionInfo(textarea)

    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        handleOutdent()
      } else {
        const res = replaceInfo(textarea, '  ', start, start)
        updateContent(res.value)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2
        }, 0)
      }
    }

    if (e.key === 'Enter') {
      const lineStart = value.lastIndexOf('\n', start - 1) + 1
      const lineContent = value.substring(lineStart, start)

      const listMatch = lineContent.match(/^(\s*)(\d+\.\s|- |> )/)
      if (listMatch && lineContent.length > listMatch[0].length) {
        e.preventDefault()
        let nextPrefix = listMatch[0]
        if (nextPrefix.includes('.')) {
          const num = parseInt(nextPrefix)
          nextPrefix = nextPrefix.replace(/\d+/, (num + 1).toString())
        }
        const insertText = '\n' + nextPrefix
        const res = replaceInfo(textarea, insertText, start, start)
        updateContent(res.value)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertText.length
        }, 0)
      } else if (listMatch && lineContent.length === listMatch[0].length) {
        e.preventDefault()
        const res = replaceInfo(textarea, '\n', lineStart, start)
        updateContent(res.value)
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = lineStart + 1
        }, 0)
      }
    }
  }

  // 로딩 중일 때
  if (isLoadingPost) {
    return (
      <div className="flex w-full items-center justify-center py-20">
        <div className="text-lg text-gray-500">게시글을 불러오는 중...</div>
      </div>
    )
  }

  return (
    <div className="flex w-full items-center justify-center py-[52px]">
      <div className="flex w-[944px] flex-col items-end gap-[52px]">

        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

        {/* 헤더 */}
        <div className="flex w-full flex-col items-start gap-5">
          <div className="flex w-full flex-col items-start gap-10">
            <div className="flex w-full flex-col items-start gap-5">
              <h1 className="font-['Pretendard'] text-[32px] font-bold tracking-[-0.64px] text-[#111111]">
                {isEditMode ? '커뮤니티 게시글 수정' : '커뮤니티 게시글 작성'}
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

                {/* 제목 */}
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

        {/* 에디터 */}
        <div className="flex w-full flex-col items-end gap-[52px]">
          <div className="flex w-full flex-col overflow-visible rounded-[20px] border border-[#E5E7EB]">
            {/* 툴바 */}
            <div className="sticky top-0 z-20 flex flex-col items-center justify-center border-b border-[#E5E7EB] bg-white px-8 py-4 shadow-sm gap-4">
              
              {/* 상단 */}
              <div className="flex w-full items-center justify-center gap-6">
                {/* 되돌리기/다시실행 */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleUndo} className="p-1 hover:bg-gray-100 rounded">
                    <UndoIcon />
                  </button>
                  <button type="button" onClick={handleRedo} className="p-1 hover:bg-gray-100 rounded">
                    <RedoIcon />
                  </button>
                </div>

                <div className="h-6 w-px bg-[#E5E7EB]" />

                {/* 글자 */}
                <div className="flex items-center gap-2">
                   <button type="button" className="flex h-8 items-center gap-2 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] cursor-not-allowed opacity-70" disabled>
                     기본서체
                     <ChevronDown className="h-4 w-4" />
                   </button>
                   
                   <div className="relative" ref={fontSizeRef}>
                     <button type="button" onClick={() => setIsFontSizeMenuOpen(!isFontSizeMenuOpen)} className="flex h-8 items-center gap-2 rounded bg-[#F3F4F6] px-3 text-sm text-[#4B5563] hover:bg-gray-200">
                       {currentFontSize}
                       <ChevronDown className="h-4 w-4" />
                     </button>
                     {isFontSizeMenuOpen && (
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


                <div className="flex items-center gap-1">
                  <button type="button" onClick={handleBold} className="p-1 hover:bg-gray-100 rounded"><ToolbarBoldIcon /></button>
                  <button type="button" onClick={handleItalic} className="p-1 hover:bg-gray-100 rounded"><ToolbarItalicIcon /></button>
                  <button type="button" onClick={handleUnderline} className="p-1 hover:bg-gray-100 rounded"><ToolbarUnderlineIcon /></button>
                  <button type="button" onClick={handleStrikethrough} className="p-1 hover:bg-gray-100 rounded"><ToolbarStrikeIcon /></button>
                  
                  {/* 컬러 */}
                  <div className="relative flex items-center gap-1" ref={textColorRef}>
                    <button type="button" onClick={() => setIsTextColorMenuOpen(!isTextColorMenuOpen)} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarColorBoxIcon selectedColor={currentTextColor} />
                    </button>
                    <button type="button" onClick={() => setIsTextColorMenuOpen(!isTextColorMenuOpen)} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarArrowIcon />
                    </button>
                    
                    <button type="button" onClick={() => setIsTextColorMenuOpen(!isTextColorMenuOpen)} className="p-1 hover:bg-gray-100 rounded">
                       <ToolbarTextIcon />
                    </button>
                    
                    {isTextColorMenuOpen && (
                      <div className="absolute top-full left-0 mt-1 w-32 rounded border border-gray-200 bg-white shadow-lg p-2 z-30 grid grid-cols-4 gap-2">
                         {['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#A52A2A', '#808080'].map(c => (
                           <div key={c} className="w-6 h-6 rounded-full cursor-pointer border border-gray-200 hover:scale-110 transition-transform" style={{ backgroundColor: c }} onClick={() => handleTextColor(c)} />
                         ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-6 w-px bg-[#E5E7EB]" />

                <div className="flex items-center gap-3">
                  <button type="button" onClick={handleLink} className="p-1 hover:bg-gray-100 rounded">
                     <ToolbarLinkIcon />
                  </button>
                  <button 
                    type="button" 
                    onClick={handleImageClick} 
                    className={`p-1 hover:bg-gray-100 rounded ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
                    disabled={isUploading}
                  >
                     {isUploading ? (
                       <span className="text-xs text-gray-500">업로드중...</span>
                     ) : (
                       <ToolbarImageIcon />
                     )}
                  </button>
                </div>
              </div>


              <div className="flex w-full items-center justify-center gap-6 border-t border-[#F3F4F6] pt-3">

                 {/* 리스트 (Bullet/Ordered) */}
            <div className="relative" ref={listMenuRef}>
              <button
                type="button"
                className="flex items-center hover:bg-gray-100 p-1 rounded transition-colors"
                onClick={() => setIsListMenuOpen(!isListMenuOpen)}
              >
                <ToolbarListGroupIcon />
              </button>
              
              {isListMenuOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 w-32 rounded-lg border border-[#E1E1E2] bg-white py-1 shadow-lg">
                  <button
                    onClick={handleUnorderedList}
                    className="flex w-full items-center px-4 py-2 text-sm text-[#52525B] hover:bg-gray-50"
                  >
                    • 불렛 리스트
                  </button>
                  <button
                    onClick={handleOrderedList}
                    className="flex w-full items-center px-4 py-2 text-sm text-[#52525B] hover:bg-gray-50"
                  >
                    1. 숫자 리스트
                  </button>
                </div>
              )}
            </div>
                 

                 <div className="flex items-center gap-2">
                   <button type="button" onClick={() => handleAlign('left')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignLeftIcon /></button>
                   <button type="button" onClick={() => handleAlign('center')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignCenterIcon /></button>
                   <button type="button" onClick={() => handleAlign('right')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignRightIcon /></button>
                   <button type="button" onClick={() => handleAlign('justify')} className="p-1 hover:bg-gray-100 rounded"><ToolbarAlignJustifyIcon /></button>
                 </div>

  
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


                 <div className="flex items-center gap-1">
                   <button type="button" onClick={handleEraser} className="p-1 hover:bg-gray-100 rounded">
                     <ToolbarEraserIcon />
                   </button>
                 </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 bg-[#E5E7EB] p-px gap-px">

              <div className="flex h-full min-h-[600px] w-full flex-col bg-white p-6">
                <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Markdown Editor</div>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => updateContent(e.target.value, true, true)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 resize-none bg-transparent font-['Pretendard'] text-[14px] leading-relaxed text-black outline-none placeholder:text-gray-300"
                  placeholder={`# 제목

**굵은 글씨**와 *기울임 꼴*

> 인용문입니다.

1. 리스트 아이템 1
2. 리스트 아이템 2

이미지 버튼을 눌러 이미지를 추가해보세요.`}
                />
              </div>


              <div className="flex h-full min-h-[600px] w-full flex-col bg-white p-6">
                <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Preview</div>
                <div className="prose prose-sm max-w-none flex-1 overflow-y-auto font-['Pretendard'] text-[14px] leading-relaxed text-black">
                   <ReactMarkdown 
                     remarkPlugins={[remarkGfm]}
                     rehypePlugins={[rehypeRaw]} 
                     components={{
                       h1: ({node, ...props}) => <h1 className="text-2xl font-bold my-4 border-b pb-2" {...props} />,
                       h2: ({node, ...props}) => <h2 className="text-xl font-bold my-3" {...props} />,
                       h3: ({node, ...props}) => <h3 className="text-lg font-bold my-2" {...props} />,
                       ul: ({node, ...props}) => <ul className="list-disc list-inside my-2 pl-2" {...props} />,
                       ol: ({node, ...props}) => <ol className="list-decimal list-inside my-2 pl-2" {...props} />,
                       blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 py-1 my-2 bg-gray-50 text-gray-600 italic" {...props} />,
                       a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                          img: ({ node, ...props }) => {
                            if (!props.src || props.src.trim() === '') return null
                            return <img className="h-auto max-w-full rounded border border-gray-100 shadow-sm" {...props} />
                          },
                          code: ({ node, ...props }) => (
                            <code className="bg-gray-100 rounded px-1.5 py-0.5 font-mono text-sm text-red-500" {...props} />
                          ),
                       pre: ({node, ...props}) => <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto my-4" {...props} />,
                        span: ({style, ...props}) => {
                          const styleObj = typeof style === 'string' 
                            ? Object.fromEntries(style.split(';').filter(Boolean).map((s: string) => s.split(':').map((x: string) => x.trim())))
                            : style
                          return <span style={styleObj as React.CSSProperties} {...props} />
                        },
                        div: ({style, ...props}) => {
                          const styleObj = typeof style === 'string'
                            ? Object.fromEntries(style.split(';').filter(Boolean).map((s: string) => s.split(':').map((x: string) => x.trim())))
                            : style
                          return <div style={styleObj as React.CSSProperties} {...props} />
                        },
                     }}
                   >
                     {content || '*미리보기가 여기에 표시됩니다.*'}
                   </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>


        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="rounded bg-[#7C3AED] px-10 py-3 text-base font-bold text-white transition-colors hover:bg-[#6D28D9] disabled:bg-gray-400"
        >
          {isLoading ? (isEditMode ? '수정 중...' : '등록 중...') : (isEditMode ? '수정하기' : '등록하기')}
        </button>
      </div>
    </div>
  )
}
