import { NavLink, Outlet } from 'react-router-dom'
import {
  FileCheck,
  FileSearch,
  BarChart3,
  GraduationCap,
  Settings,
  User,
  Bell,
  Library,
} from 'lucide-react'

const navItems = [
  { to: '/', label: '工作台', icon: GraduationCap },
  { to: '/proofread', label: '文本校对', icon: FileCheck },
  { to: '/dedup', label: '文档查重', icon: FileSearch },
  { to: '/analysis', label: '数据分析', icon: BarChart3 },
  { to: '/knowledge', label: '文档库入口', icon: Library },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-[hsl(220,20%,97%)]">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        <div className="flex h-16 items-center px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mr-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
              教育辅助平台
            </span>
          </div>

          {/* 导航链接 */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 shadow-sm shadow-blue-500/10'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* 右侧操作区 */}
          <div className="ml-auto flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-200">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <button className="p-2.5 rounded-xl text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all duration-200">
              <Settings className="h-[18px] w-[18px]" />
            </button>
            <div className="ml-1 flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-700">教师</span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="px-8 py-8 pb-16 animate-fade-in-up">
        <Outlet />
      </main>

      {/* 底部状态栏 */}
      <footer className="fixed bottom-0 w-full border-t border-gray-200/60 bg-white/80 backdrop-blur-xl px-8 py-2.5">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>系统状态：正常运行</span>
          </div>
          <span>文档库最近更新：2024-01-15 14:30</span>
        </div>
      </footer>
    </div>
  )
}
