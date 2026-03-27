import { BarChart3, Mail, MousePointerClick, Reply, Server, CheckCircle2, AlertCircle, Activity } from 'lucide-react';

export function Dashboard() {
  const stats = [
    { label: 'Odeslané (Dnes)', value: '0', icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Open Rate', value: '0.0%', icon: BarChart3, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Click Rate', value: '0.0%', icon: MousePointerClick, color: 'text-purple-600', bg: 'bg-purple-100' },
    { label: 'Reply Rate', value: '0.0%', icon: Reply, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  const campaigns: any[] = [];

  const accounts: any[] = [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Přehled výkonu kampaní a stavu infrastruktury</p>
      </div>
      
      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.bg}`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <Activity className="w-4 h-4 text-gray-300" />
              </div>
              <h3 className="text-gray-500 text-sm font-medium">{stat.label}</h3>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Campaigns Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Úspěšnost Kampaní</h2>
            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">Zobrazit vše</button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium">Kampaň</th>
                  <th className="px-6 py-4 font-medium text-right">Odesláno</th>
                  <th className="px-6 py-4 font-medium text-right">Odpovědi</th>
                  <th className="px-6 py-4 font-medium text-right">Reply Rate</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {campaigns.map((camp) => (
                  <tr key={camp.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{camp.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${
                          camp.status === 'Běží' ? 'bg-green-500' : 
                          camp.status === 'Pozastaveno' ? 'bg-yellow-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-xs text-gray-500">{camp.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 font-medium">{camp.sent}</td>
                    <td className="px-6 py-4 text-right text-gray-900 font-semibold">{camp.replied}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {camp.replyRate}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Accounts Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Stav E-mailových Účtů</h2>
            <div className="text-sm text-gray-500">
              Aktivní: <span className="font-medium text-gray-900">0/0</span>
            </div>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-4 font-medium">Účet</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Odesláno Dnes</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Server className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{acc.email}</div>
                          <div className="text-xs text-gray-500">{acc.provider}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {acc.status === 'online' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Online
                        </span>
                      )}
                      {acc.status === 'limit_reached' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Limit Dosažen
                        </span>
                      )}
                      {acc.status === 'error' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                          <AlertCircle className="w-3.5 h-3.5" /> Odpojeno
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${acc.sent >= acc.limit ? 'bg-yellow-400' : 'bg-blue-500'}`}
                            style={{ width: `${Math.min((acc.sent / acc.limit) * 100, 100)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-12 text-right">
                          {acc.sent} / {acc.limit}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
