import React, { useState, useRef, useEffect } from 'react';
import { Upload, Search, Filter, Download, Loader2, Edit2, Trash2, X, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';

export function Contacts() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit modal state
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts');
      const data = await response.json();
      if (data.success) {
        // Transform database format to UI format
        const formatted = data.data.map((c: any) => ({
          id: c.id,
          first_name: c.first_name || '',
          last_name: c.last_name || '',
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim(),
          email: c.email,
          company: c.custom_fields?.company || '',
          role: c.custom_fields?.role || '',
          status: c.status
        }));
        setContacts(formatted);
      }
    } catch (error) {
      console.error('Chyba při načítání kontaktů:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Opravdu chcete smazat tento kontakt?')) return;
    try {
      const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        setContacts(contacts.filter(c => c.id !== id));
      } else {
        alert('Chyba při mazání: ' + data.error);
      }
    } catch (error) {
      alert('Chyba sítě.');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/contacts/${editingContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editingContact.first_name,
          last_name: editingContact.last_name,
          email: editingContact.email,
          custom_fields: {
            company: editingContact.company,
            role: editingContact.role
          }
        })
      });
      const data = await response.json();
      if (data.success) {
        await fetchContacts();
        setEditingContact(null);
      } else {
        alert('Chyba při ukládání: ' + data.error);
      }
    } catch (error) {
      alert('Chyba sítě.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const newContacts = results.data.map((row: any, index) => ({
          id: `contact-${Date.now()}-${index}`,
          name: row.name || row.jmeno || row.Jméno || row.Name || '',
          email: row.email || row.e_mail || row.Email || '',
          company: row.company || row.firma || row.Firma || row.Company || '',
          role: row.role || row.pozice || row.Pozice || row.Role || '',
          status: 'active'
        })).filter(c => c.email); // Přidáme jen ty, co mají e-mail

        if (newContacts.length === 0) {
            alert('V CSV souboru nebyly nalezeny žádné platné kontakty (chybí sloupec "email").');
            setIsUploading(false);
        } else {
            try {
                // Odeslání na backend
                const response = await fetch('/api/contacts/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contacts: newContacts })
                });
                const data = await response.json();
                
                if (data.success) {
                    alert(data.message);
                    await fetchContacts(); // Znovu načíst z databáze
                } else {
                    alert('Chyba při ukládání: ' + data.error);
                }
            } catch (error) {
                console.error('Chyba:', error);
                alert('Chyba při komunikaci se serverem.');
            } finally {
                setIsUploading(false);
            }
        }
        
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        console.error('Chyba při parsování CSV:', error);
        alert('Nepodařilo se zpracovat CSV soubor.');
        setIsUploading(false);
      }
    });
  };

  const downloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,name,email,company,role\nJan Novák,jan@novak.cz,Novák s.r.o.,CEO\nPetr Dvořák,petr@dvorak.cz,Dvořák a syn,CTO";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "kontakty_sablona.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kontakty</h1>
          <p className="text-gray-500 mt-1">Správa kontaktů a custom fields (JSONB)</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadTemplate}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download className="w-5 h-5" />
            Vzorové CSV
          </button>
          
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Import CSV
          </button>
        </div>
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
              <th className="px-6 py-4 font-medium text-right">Akce</th>
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
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditingContact(contact)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Upravit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(contact.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Smazat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Upravit Kontakt</h2>
              <button onClick={() => setEditingContact(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jméno</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={editingContact.first_name}
                    onChange={e => setEditingContact({...editingContact, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Příjmení</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={editingContact.last_name}
                    onChange={e => setEditingContact({...editingContact, last_name: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={editingContact.email}
                  onChange={e => setEditingContact({...editingContact, email: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={editingContact.company}
                  onChange={e => setEditingContact({...editingContact, company: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pozice</label>
                <input 
                  type="text" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={editingContact.role}
                  onChange={e => setEditingContact({...editingContact, role: e.target.value})}
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Zrušit
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                Uložit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
