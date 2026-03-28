import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, Play, Pause, Settings2, Plus, Trash2, Wand2, Users, Mail, Loader2, CheckCircle2, X, ChevronLeft } from 'lucide-react';

export function Campaigns() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [campaignDetails, setCampaignDetails] = useState<any | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [activeStepId, setActiveStepId] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Test email modal state
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testAccountId, setTestAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Add contacts modal state
  const [isAddContactsModalOpen, setIsAddContactsModalOpen] = useState(false);
  const [allContacts, setAllContacts] = useState<any[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [isAddingContacts, setIsAddingContacts] = useState(false);

  // New Campaign Modal
  const [isNewCampaignModalOpen, setIsNewCampaignModalOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchAccounts();
    fetchAllContacts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data.filter((a: any) => a.status === 'active'));
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const fetchAllContacts = async () => {
    try {
      const res = await fetch('/api/contacts');
      const data = await res.json();
      if (data.success) {
        setAllContacts(data.data);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const fetchCampaignDetails = async (id: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`);
      const data = await res.json();
      if (data.success) {
        setCampaignDetails(data.data);
        if (data.data.steps && data.data.steps.length > 0) {
          setActiveStepId(data.data.steps[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCampaign = (id: string) => {
    setSelectedCampaignId(id);
    fetchCampaignDetails(id);
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName) return;
    setIsCreatingCampaign(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCampaignName })
      });
      const data = await res.json();
      if (data.success) {
        await fetchCampaigns();
        handleSelectCampaign(data.data.id);
        setIsNewCampaignModalOpen(false);
        setNewCampaignName('');
      } else {
        console.error('Chyba při vytváření kampaně: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba sítě.');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const updateStep = (id: number, field: string, value: string | number) => {
    if (!campaignDetails) return;
    const newSteps = campaignDetails.steps.map((step: any) => 
      step.id === id ? { ...step, [field]: value } : step
    );
    setCampaignDetails({ ...campaignDetails, steps: newSteps });
  };

  const saveStep = async (stepId: number) => {
    if (!campaignDetails) return;
    const step = campaignDetails.steps.find((s: any) => s.id === stepId);
    if (!step) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignDetails.id}/steps/${stepId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: step.subject, body: step.body })
      });
      const data = await res.json();
      if (!data.success) {
        alert('Chyba při ukládání kroku: ' + data.error);
      }
    } catch (error) {
      alert('Chyba sítě.');
    } finally {
      setIsSaving(false);
    }
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current || !activeStepId || !campaignDetails) return;
    const step = campaignDetails.steps.find((s: any) => s.id === activeStepId);
    if (!step) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentBody = step.body || '';
    const newBody = currentBody.substring(0, start) + tag + currentBody.substring(end);
    
    updateStep(activeStepId, 'body', newBody);
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSendTest = async () => {
    if (!testEmail || !testAccountId || !activeStepId || !campaignDetails) {
      alert('Vyplňte e-mail a vyberte účet.');
      return;
    }

    setIsSendingTest(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignDetails.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail,
          accountId: testAccountId,
          stepId: activeStepId
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Testovací e-mail byl úspěšně odeslán!');
        setIsTestModalOpen(false);
      } else {
        alert('Chyba při odesílání: ' + data.error);
      }
    } catch (error) {
      alert('Chyba sítě.');
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleAddContacts = async () => {
    if (selectedContactIds.length === 0 || !campaignDetails) return;
    
    setIsAddingContacts(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignDetails.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds: selectedContactIds })
      });
      const data = await res.json();
      if (data.success) {
        await fetchCampaignDetails(campaignDetails.id);
        setIsAddContactsModalOpen(false);
        setSelectedContactIds([]);
      } else {
        alert('Chyba při přidávání kontaktů: ' + data.error);
      }
    } catch (error) {
      alert('Chyba sítě.');
    } finally {
      setIsAddingContacts(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!campaignDetails) return;
    
    try {
      const res = await fetch(`/api/campaigns/${campaignDetails.id}/contacts/${contactId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        await fetchCampaignDetails(campaignDetails.id);
      } else {
        console.error('Chyba při odebírání kontaktu: ' + data.error);
      }
    } catch (error) {
      console.error('Chyba sítě.');
    }
  };

  if (isLoading && !campaignDetails) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  if (!selectedCampaignId || !campaignDetails) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kampaně</h1>
            <p className="text-gray-500 mt-1">Správa e-mailových sekvencí a kampaní</p>
          </div>
          <button 
            onClick={() => setIsNewCampaignModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Nová Kampaň
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleSelectCampaign(c.id)}>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-gray-900 text-lg">{c.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {c.status}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-1"><Users className="w-4 h-4" /> {c.contacts_count} kontaktů</div>
                <div className="flex items-center gap-1"><Mail className="w-4 h-4" /> {c.steps_count} kroků</div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              Zatím nemáte žádné kampaně. Vytvořte první!
            </div>
          )}
        </div>

        {/* New Campaign Modal */}
        {isNewCampaignModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Nová Kampaň</h2>
                <button onClick={() => setIsNewCampaignModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Název kampaně</label>
                  <input 
                    type="text" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    value={newCampaignName}
                    onChange={e => setNewCampaignName(e.target.value)}
                    placeholder="např. Q3 B2B Outreach"
                    autoFocus
                  />
                </div>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsNewCampaignModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Zrušit
                </button>
                <button 
                  onClick={handleCreateCampaign}
                  disabled={isCreatingCampaign || !newCampaignName}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isCreatingCampaign ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Vytvořit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeStep = campaignDetails.steps?.find((s: any) => s.id === activeStepId);

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => { setSelectedCampaignId(null); setCampaignDetails(null); fetchCampaigns(); }} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{campaignDetails.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${campaignDetails.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                {campaignDetails.status}
              </span>
            </div>
            <p className="text-gray-500">Editor e-mailové sekvence a nastavení kampaně</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsTestModalOpen(true)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Testovací e-mail
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
            <Play className="w-4 h-4" />
            Spustit Kampaň
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar - Sequence Steps */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-semibold text-gray-900">Sekvence e-mailů</h2>
            </div>
            <div className="p-2 space-y-1">
              {campaignDetails.steps?.map((step: any, index: number) => (
                <div 
                  key={step.id}
                  onClick={() => setActiveStepId(step.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all border ${
                    activeStepId === step.id 
                      ? 'bg-blue-50 border-blue-200 shadow-sm' 
                      : 'bg-white border-transparent hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-semibold ${activeStepId === step.id ? 'text-blue-700' : 'text-gray-700'}`}>
                      Krok {index + 1}
                    </span>
                    {index > 0 && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {step.delay_days || 0} dny
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {step.subject || 'Bez předmětu...'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Contacts in Campaign */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="font-semibold text-gray-900">Kontakty ({campaignDetails.contacts?.length || 0})</h2>
              <button onClick={() => setIsAddContactsModalOpen(true)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                Přidat
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto p-2">
              {campaignDetails.contacts?.map((contact: any) => (
                <div key={contact.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{contact.first_name} {contact.last_name}</p>
                    <p className="text-xs text-gray-500 truncate">{contact.email}</p>
                  </div>
                  <button onClick={() => handleRemoveContact(contact.id)} className="text-gray-400 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!campaignDetails.contacts || campaignDetails.contacts.length === 0) && (
                <p className="text-sm text-gray-500 p-2 text-center">Žádné kontakty v kampani.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Area - Editor */}
        <div className="lg:col-span-9">
          {activeStep ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
              {/* Editor Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
                <div className="flex items-center gap-4">
                  <h2 className="font-semibold text-gray-900">
                    Editace: Krok {campaignDetails.steps.findIndex((s: any) => s.id === activeStepId) + 1}
                  </h2>
                </div>
                <button 
                  onClick={() => saveStep(activeStep.id)}
                  disabled={isSaving}
                  className="px-4 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Uložit krok
                </button>
              </div>

              {/* Editor Body */}
              <div className="flex-1 flex flex-col p-6 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Předmět</label>
                  <input 
                    type="text" 
                    value={activeStep.subject || ''}
                    onChange={(e) => updateStep(activeStep.id, 'subject', e.target.value)}
                    placeholder="Zadejte poutavý předmět..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                  />
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider">Tělo e-mailu</label>
                    
                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => insertTag('{{first_name}}')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        <Users className="w-3 h-3" /> {'{{first_name}}'}
                      </button>
                      <button 
                        onClick={() => insertTag('{{company}}')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                      >
                        <Users className="w-3 h-3" /> {'{{company}}'}
                      </button>
                      <div className="w-px h-4 bg-gray-300 mx-1"></div>
                      <button 
                        onClick={() => insertTag('{Ahoj|Dobrý den|Zdravím}')}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-pink-700 bg-pink-50 hover:bg-pink-100 rounded border border-pink-200 transition-colors"
                        title="Vložit Spintax pro náhodný pozdrav"
                      >
                        <Wand2 className="w-3 h-3" /> Spintax Pozdrav
                      </button>
                    </div>
                  </div>
                  
                  <textarea 
                    ref={textareaRef}
                    value={activeStep.body || ''}
                    onChange={(e) => updateStep(activeStep.id, 'body', e.target.value)}
                    placeholder="Napište zprávu... Použijte tlačítka výše pro vložení proměnných."
                    className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-mono text-sm leading-relaxed text-gray-800"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex items-center justify-center h-[600px] text-gray-500">
              Vyberte krok pro editaci
            </div>
          )}
        </div>
      </div>

      {/* Test Email Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Odeslat testovací e-mail</h2>
              <button onClick={() => setIsTestModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail příjemce</label>
                <input 
                  type="email" 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="vas@email.cz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Odeslat přes účet</label>
                <select 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={testAccountId}
                  onChange={e => setTestAccountId(e.target.value)}
                >
                  <option value="">Vyberte SMTP účet...</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.email}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsTestModalOpen(false)}
                className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
              >
                Zrušit
              </button>
              <button 
                onClick={handleSendTest}
                disabled={isSendingTest || !testEmail || !testAccountId}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isSendingTest ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                Odeslat test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Contacts Modal */}
      {isAddContactsModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Přidat kontakty do kampaně</h2>
              <button onClick={() => setIsAddContactsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                {allContacts.map(contact => {
                  const isInCampaign = campaignDetails.contacts?.some((c: any) => c.id === contact.id);
                  return (
                    <label key={contact.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isInCampaign ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200 cursor-pointer hover:bg-blue-50'}`}>
                      <input 
                        type="checkbox" 
                        disabled={isInCampaign}
                        checked={isInCampaign || selectedContactIds.includes(contact.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedContactIds([...selectedContactIds, contact.id]);
                          } else {
                            setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{contact.first_name} {contact.last_name}</p>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                      </div>
                      {isInCampaign && <span className="ml-auto text-xs font-medium text-gray-500">Již v kampani</span>}
                    </label>
                  );
                })}
                {allContacts.length === 0 && (
                  <p className="text-center text-gray-500 py-8">Nemáte žádné kontakty. Nejprve je importujte v sekci Kontakty.</p>
                )}
              </div>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-sm text-gray-600">Vybráno: {selectedContactIds.length}</span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsAddContactsModalOpen(false)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Zrušit
                </button>
                <button 
                  onClick={handleAddContacts}
                  disabled={isAddingContacts || selectedContactIds.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isAddingContacts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  Přidat vybrané
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
