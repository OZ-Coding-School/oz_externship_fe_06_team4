import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/index'

// Button 컴포넌트 대체 (간단한 버전)
const Button = ({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className = '',
  type = 'button',
  ...props
}: any) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}

// 드롭다운 스타일
const dropdownContainerClass =
  'absolute top-17 right-0 z-50 w-[204px] rounded-[12px] bg-white px-[16px] py-[16px] shadow-[0_0_16px_0_#A0A0A040]'
const userInfoContainerClass = 'h-[53px] w-[172px] items-start gap-[20px]'
const userNameClass = 'text-[16px] font-semibold text-black py-2'
const userEmailClass = 'text-[14px] font-normal text-gray-400 mb-2'
const dividerClass = 'my-4 border-t border-mono-200'
const dropdownButtonClass =
  'hover:no-underline hover:bg-primary-100 hover:text-primary block w-full justify-start p-2 text-left text-sm'

export default function Header() {
  const [open, setOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuButtonRef = useRef<HTMLDivElement | null>(null)

  const navigate = useNavigate()

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)

  const isAuthenticated = isLoggedIn

  // 드롭다운/모바일 메뉴 바깥 클릭하면 닫히기
  useEffect(() => {
    if (!open && !mobileMenuOpen) return

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node
      const clickedOutsideDesktopMenu =
        open && dropdownRef.current && !dropdownRef.current.contains(target)
      const clickedOutsideMobileMenu =
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(target) &&
        !mobileMenuButtonRef.current?.contains(target)

      if (clickedOutsideDesktopMenu) setOpen(false)
      if (clickedOutsideMobileMenu) setMobileMenuOpen(false)
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open, mobileMenuOpen])

  const handleLogout = async () => {
    setOpen(false)
    setMobileMenuOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-50 w-full">
      {/* 상단 알림 바 */}
      <div className="w-full bg-[#222222] text-center text-sm text-white">
        <div className="mx-auto max-w-[1200px] truncate px-4 py-2 font-[Pretendard] text-[12px] sm:text-sm">
          🚨 선착순 모집! 국비지원 받고 4주 완성
        </div>
      </div>

      {/* 메인 헤더 */}
      <div className="relative w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5">
          {/* 왼쪽: 로고 + 메뉴 */}
            <a href="https://my.ozcodingschool.site/" className="flex items-center">
              <svg
                width="150"
                height="20"
                viewBox="0 0 150 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                xmlnsXlink="http://www.w3.org/1999/xlink"
                className="block"
              >
                <rect
                  width="149.677"
                  height="20"
                  fill="url(#pattern0_91_5521)"
                />
                <defs>
                  <pattern
                    id="pattern0_91_5521"
                    patternContentUnits="objectBoundingBox"
                    width="1"
                    height="1"
                  >
                    <use
                      xlinkHref="#image0_91_5521"
                      transform="scale(0.00215517 0.016129)"
                    />
                  </pattern>
                  <image
                    id="image0_91_5521"
                    width="464"
                    height="62"
                    preserveAspectRatio="none"
                    xlinkHref="data:image/png;base64,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"
                  />
                </defs>
              </svg>
            </a>
            <div>
            <nav className="hidden gap-10 font-[Pretendard] text-[18px] text-gray-700 lg:flex">
              <a
                href="https://community.ozcodingschool.site/"
                className="transition-colors duration-200 hover:text-black"
              >
                커뮤니티
              </a>
              <a
                href="https://qna.ozcodingschool.site/"
                className="transition-colors duration-200 hover:text-black"
              >
                질의응답
              </a>
            </nav>
          </div>

          {/* 오른쪽 메뉴: 데스크톱 */}
          <div className="hidden items-center gap-2 font-[Pretendard] text-[16px] text-gray-500 lg:flex">
            {!isAuthenticated ? (
              <>
                <Button
                  type="button"
                  variant="link"
                  size="auto"
                  className="text-mono-600 hover:text-mono-600 py-0 font-[Pretendard] text-[16px] hover:no-underline"
                  onClick={() => navigate('/login')}
                >
                  로그인
                </Button>
                <span className="text-mono-400">|</span>
                <Button
                  type="button"
                  variant="link"
                  size="auto"
                  className="text-mono-600 hover:text-mono-600 py-0 font-[Pretendard] text-[16px] hover:no-underline"
                  onClick={() => navigate('/signup')}
                >
                  회원가입
                </Button>
              </>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <Button
                  type="button"
                  variant="link"
                  size="auto"
                  className="min-w-0 p-0 hover:no-underline hover:opacity-80"
                  onClick={() => setOpen((prev) => !prev)}
                  aria-expanded={open}
                  aria-label="프로필 메뉴 열기"
                >
                  <img
                    src={
                      user?.profile_img_url
                        ? user.profile_img_url
                        : '/icons/profile.svg'
                    }
                    alt="프로필"
                    className="h-[40px] w-[40px] rounded-full object-cover"
                  />
                </Button>

                {open && (
                  <div className={dropdownContainerClass}>
                    <div className={userInfoContainerClass}>
                      <p className={userNameClass}>{user?.nickname ?? '유저'}</p>
                      <p className={userEmailClass}>{user?.email ?? ''}</p>
                    </div>

                    <div className={dividerClass} />

                    <a
                      href="https://my.ozcodingschool.site/mypage/profile"
                      className={dropdownButtonClass}
                      onClick={() => setOpen(false)}
                    >
                      마이페이지
                    </a>

                    <Button
                      type="button"
                      variant="link"
                      size="auto"
                      className={dropdownButtonClass}
                      onClick={handleLogout}
                    >
                      로그아웃
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 오른쪽 메뉴: 모바일 햄버거 */}
          <div ref={mobileMenuButtonRef} className="lg:hidden">
            <Button
              type="button"
              variant="link"
              size="auto"
              className="p-1 hover:no-underline min-w-0 rounded-[8px]"
              onClick={() => {
                setMobileMenuOpen((prev) => !prev)
                setOpen(false)
              }}
              aria-expanded={mobileMenuOpen}
              aria-label="모바일 메뉴 열기"
            >
              <span className="flex h-8 w-8 flex-col items-center justify-center gap-1">
                <span className="block h-[2px] w-5 rounded bg-[#222222]" />
                <span className="block h-[2px] w-5 rounded bg-[#222222]" />
                <span className="block h-[2px] w-5 rounded bg-[#222222]" />
              </span>
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            className="border-t border-gray-200 bg-white shadow-[0_8px_20px_0_#00000014] lg:hidden"
          >
            <div className="mx-auto max-w-[1200px] px-5 py-4">
              <nav className="flex flex-col gap-1 font-[Pretendard] text-[16px] text-gray-700">
                <a
                  href="https://community.ozcodingschool.site/"
                  className="hover:bg-primary-100 rounded-[8px] px-2 py-2 transition-colors duration-200 hover:text-black"
                >
                  커뮤니티
                </a>
                <a
                  href="https://qna.ozcodingschool.site/"
                  className="hover:bg-primary-100 rounded-[8px] px-2 py-2 transition-colors duration-200 hover:text-black"
                >
                  질의응답
                </a>
              </nav>

              <div className="border-mono-200 mt-3 border-t pt-3">
                {!isAuthenticated ? (
                  <div className="flex flex-col gap-1">
                    <Button
                      type="button"
                      variant="link"
                      size="auto"
                      className="text-mono-700 hover:bg-primary-100 w-full justify-start rounded-[8px] px-2 py-2 font-[Pretendard] text-[16px] hover:no-underline"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/login')
                      }}
                    >
                      로그인
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      size="auto"
                      className="text-mono-700 hover:bg-primary-100 w-full justify-start rounded-[8px] px-2 py-2 font-[Pretendard] text-[16px] hover:no-underline"
                      onClick={() => {
                        setMobileMenuOpen(false)
                        navigate('/signup')
                      }}
                    >
                      회원가입
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="bg-mono-100 mb-2 flex items-center gap-4 rounded-[8px] px-1 py-2">
                      <img
                        src={
                          user?.profile_img_url
                            ? user.profile_img_url
                            : '/icons/profile.svg'
                        }
                        alt="프로필"
                        className="h-[40px] w-[40px] shrink-0 rounded-full object-cover"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-black">
                          {user?.nickname ?? '유저'}
                        </p>
                        <p className="text-mono-500 truncate text-[13px]">
                          {user?.email ?? ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <a
                        href="https://my.ozcodingschool.site/mypage/profile"
                        className="hover:bg-primary-100 hover:text-primary w-full justify-start rounded-[8px] px-2 py-2 text-left text-sm hover:no-underline block"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        마이페이지
                      </a>

                      <Button
                        type="button"
                        variant="link"
                        size="auto"
                        className="hover:bg-primary-100 hover:text-primary w-full justify-start rounded-[8px] px-2 py-2 text-left text-sm hover:no-underline"
                        onClick={handleLogout}
                      >
                        로그아웃
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}