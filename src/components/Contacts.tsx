import { Upload, Search, Filter } from 'lucide-react';

export function Contacts() {
  const contacts: any[] = [];

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontakty</h1>
          <p className="text-gray-500 mt-1">Správa kontaktů a custom fields (JSONB)</p>
        </div>
        <button className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Upload className="w-5 h-5" />
          Import CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Hledat kontakty..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtry
          </button>
        </div>

        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
              <th className="px-6 py-4 font-medium">Jméno & E-mail</th>
              <th className="px-6 py-4 font-medium">Firma (Custom Field)</th>
              <th className="px-6 py-4 font-medium">Pozice (Custom Field)</th>
              <th className="px-6 py-4 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {contacts.map((contact) => (
              <tr key={contact.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900">{contact.name}</div>
                  <div className="text-gray-500">{contact.email}</div>
                </td>
                <td className="px-6 py-4 text-gray-600">{contact.company}</td>
                <td className="px-6 py-4 text-gray-600">{contact.role}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    contact.status === 'active' ? 'bg-blue-100 text-blue-800' :
                    contact.status === 'replied' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {contact.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
