export function SidebarHeader() {
  return (
    <div className="p-6 border-b border-gray-700 flex items-center space-x-3 space-x-reverse">
      <div className="w-10 h-10 rounded-xl overflow-hidden">
        <img
          src="/logo.svg"
          alt="TochnaShifts Logo"
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
      <div>
        <h1 className="text-xl font-bold text-white">תוכנה משמרות</h1>
        <p className="text-sm text-gray-400">ניהול משמרות</p>
      </div>
    </div>
  );
}
