import { useState, useRef, useEffect } from 'react';
import { Plus, Server, CheckCircle2, AlertCircle, Upload, Loader2, Play, Download } from 'lucide-react';
import Papa from 'papaparse';

interface SmtpAccount {
  id: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  provider: string;
  limit: number;
  sent: number;
  status: 'active' | 'error' | 'limit_reached' | 'unverified' | 'verifying';
  error_message?: string;
}

export function Accounts() {
  const [accounts, setAccounts] = useState<SmtpAccount[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      const data = await response.json();
      if (data.success) {
        const formatted = data.data.map((a: any) => ({
          id: a.id,
          email: a.email,
          smtp_host: a.smtp_host,
          smtp_port: a.smtp_port,
          smtp_user: a.smtp_user,
          smtp_pass: '********', // Heslo neposíláme z backendu
          provider: a.smtp_host?.includes('gmail') ? 'Google Workspace' : a.smtp_host?.includes('office365') ? 'Microsoft 365' : 'Vlastní SMTP',
          limit: a.daily_limit,
          sent: a.sent || 0,
          status: a.status,
          error_message: a.error_message
        }));
        setAccounts(formatted);
      }
    } catch (error) {
      console.error('Chyba při načítání účtů:', error);
    } finally {
      setIsLoading(false);
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
        const newAccounts: SmtpAccount[] = results.data.map((row: any, index) => ({
          id: `imported-${Date.now()}-${index}`,
          email: row.email || row.smtp_user || 'Neznámý e-mail',
          smtp_host: row.smtp_host || '',
          smtp_port: parseInt(row.smtp_port, 10) || 465,
          smtp_user: row.smtp_user || row.email || '',
          smtp_pass: row.smtp_pass || row.password || '',
          provider: row.smtp_host?.includes('gmail') ? 'Google Workspace' : row.smtp_host?.includes('office365') ? 'Microsoft 365' : 'Vlastní SMTP',
          limit: parseInt(row.daily_limit, 10) || 50,
          sent: 0,
          status: 'unverified'
        })).filter(a => a.smtp_host && a.smtp_user && a.smtp_pass);

        if (newAccounts.length === 0) {
            alert('V CSV souboru nebyly nalezeny žádné platné účty. Zkontrolujte názvy sloupců (smtp_host, smtp_port, smtp_user, smtp_pass).');
            setIsUploading(false);
        } else {
            try {
                const response = await fetch('/api/accounts/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accounts: newAccounts })
                });
                const data = await response.json();
                
                if (data.success) {
                    alert(data.message);
                    await fetchAccounts();
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
    const csvContent = "data:text/csv;charset=utf-8,email,smtp_host,smtp_port,smtp_user,smtp_pass,daily_limit\njan@mojefirma.cz,smtp.forpsi.com,465,jan@mojefirma.cz,TajneHeslo123,50\npetr@mojefirma.cz,smtp.seznam.cz,465,petr@mojefirma.cz,JineHeslo456,100";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "smtp_ucty_sablona.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const verifyAccount = async (id: string) => {
    const account = accounts.find(a => a.id === id);
    if (!account) return;

    // Set status to verifying
    setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'verifying', error_message: undefined } : a));

    try {
      const response = await fetch(`/api/accounts/${id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (data.success) {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'active', error_message: undefined } : a));
      } else {
        setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error_message: data.error } : a));
      }
    } catch (error: any) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, status: 'error', error_message: error.message || 'Chyba sítě' } : a));
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">E-mailové Účty</h1>
          <p className="text-gray-500 mt-1">Správa SMTP/IMAP účtů pro odesílání (Round Robin)</p>
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
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
            Import z CSV
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors">
            <Plus className="w-5 h-5" />
            Přidat Účet
          </button>
        </div>
      </div>

      {/* Nápověda pro CSV */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 text-sm text-blue-800">
        <p className="font-semibold mb-1">Formát CSV pro import:</p>
        <code className="bg-white px-2 py-1 rounded border border-blue-200 text-xs">email, smtp_host, smtp_port, smtp_user, smtp_pass, daily_limit</code>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts.map((acc) => (
          <div key={acc.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5 text-gray-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate" title={acc.email}>{acc.email}</h3>
                  <p className="text-xs text-gray-500 truncate">{acc.provider} • {acc.smtp_host}:{acc.smtp_port}</p>
                </div>
              </div>
              <div className="shrink-0 ml-2">
                {acc.status === 'active' && <CheckCircle2 className="w-5 h-5 text-green-500" title="Aktivní" />}
                {acc.status === 'limit_reached' && <AlertCircle className="w-5 h-5 text-yellow-500" title="Dosažen limit" />}
                {acc.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500" title={acc.error_message || 'Chyba připojení'} />}
                {acc.status === 'unverified' && <div className="w-3 h-3 rounded-full bg-gray-300 mt-1" title="Neověřeno"></div>}
                {acc.status === 'verifying' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
              </div>
            </div>

            {acc.status === 'error' && acc.error_message && (
              <div className="mb-4 text-xs text-red-600 bg-red-50 p-2 rounded border border-red-100 break-words">
                {acc.error_message}
              </div>
            )}

            <div className="mt-auto">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Dnešní limit</span>
                <span className="font-medium text-gray-900">{acc.sent} / {acc.limit}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                <div 
                  className={`h-2 rounded-full ${
                    acc.sent >= acc.limit ? 'bg-yellow-400' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((acc.sent / acc.limit) * 100, 100)}%` }}
                ></div>
              </div>

              <button 
                onClick={() => verifyAccount(acc.id)}
                disabled={acc.status === 'verifying'}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {acc.status === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {acc.status === 'active' ? 'Znovu ověřit' : 'Ověřit připojení'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
