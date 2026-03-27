import { Plus, Server, CheckCircle2, AlertCircle } from 'lucide-react';

export function Accounts() {
  const accounts = [
    { id: 1, email: 'jan@getfirma.cz', provider: 'Google Workspace', limit: 50, sent: 42, status: 'active' },
    { id: 2, email: 'info@getfirma.cz', provider: 'Google Workspace', limit: 50, sent: 50, status: 'limit_reached' },
    { id: 3, email: 'hello@zkuste-firma.cz', provider: 'Microsoft 365', limit: 30, sent: 12, status: 'active' },
    { id: 4, email: 'sales@zkuste-firma.cz', provider: 'Microsoft 365', limit: 30, sent: 0, status: 'error' },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-mailové Účty</h1>
          <p className="text-gray-500 mt-1">Správa SMTP/IMAP účtů pro odesílání (Round Robin)</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-5 h-5" />
          Přidat Účet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Server className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{acc.email}</h3>
                  <p className="text-xs text-gray-500">{acc.provider}</p>
                </div>
              </div>
              {acc.status === 'active' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {acc.status === 'limit_reached' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
              {acc.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Dnešní limit</span>
                <span className="font-medium text-gray-900">{acc.sent} / {acc.limit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    acc.sent >= acc.limit ? 'bg-yellow-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((acc.sent / acc.limit) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
