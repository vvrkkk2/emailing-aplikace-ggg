import { useState, useRef } from 'react';
import { Calendar, Clock, Play, Pause, Settings2, Plus, Trash2, Wand2, Users } from 'lucide-react';

export function Campaigns() {
  const [steps, setSteps] = useState([
    { 
      id: 1, 
      delayDays: 0, 
      subject: 'Rychlý dotaz ohledně {{firma}}', 
      body: '{Ahoj|Dobrý den|Zdravím} {{jmeno}},\n\nvšiml jsem si, že v {{firma}} děláte skvělé věci. Jako {{pozice}} určitě řešíte optimalizaci procesů.\n\nMáte tento týden 10 minut na krátký call?\n\nS pozdravem,\nJan' 
    },
    { 
      id: 2, 
      delayDays: 3, 
      subject: 'Re: Rychlý dotaz ohledně {{firma}}', 
      body: '{Ahoj|Dobrý den} {{jmeno}},\n\njen posouvám tento e-mail nahoru. Podařilo se vám na to mrknout?\n\nDíky,\nJan' 
    }
  ]);
  
  const [activeStepId, setActiveStepId] = useState(1);
  const activeStep = steps.find(s => s.id === activeStepId) || steps[0];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateStep = (id: number, field: string, value: string | number) => {
    setSteps(steps.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const addStep = () => {
    const newId = Math.max(...steps.map(s => s.id)) + 1;
    setSteps([...steps, { id: newId, delayDays: 3, subject: '', body: '' }]);
    setActiveStepId(newId);
  };

  const removeStep = (id: number) => {
    if (steps.length <= 1) return;
    const newSteps = steps.filter(s => s.id !== id);
    setSteps(newSteps);
    if (activeStepId === id) setActiveStepId(newSteps[0].id);
  };

  const insertTag = (tag: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentBody = activeStep.body;
    const newBody = currentBody.substring(0, start) + tag + currentBody.substring(end);
    
    updateStep(activeStep.id, 'body', newBody);
    
    // Focus back and move cursor after inserted tag
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Q3 B2B Outreach - CZ</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
              Draft
            </span>
          </div>
          <p className="text-gray-500">Editor e-mailové sekvence a nastavení kampaně</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors">
            Uložit koncept
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
              {steps.map((step, index) => (
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
                        <Clock className="w-3 h-3" /> {step.delayDays} dny
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {step.subject || 'Bez předmětu...'}
                  </p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <button 
                onClick={addStep}
                className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" /> Přidat další krok
              </button>
            </div>
          </div>

          {/* Campaign Settings Summary */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-gray-400" />
              Nastavení odesílání
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Dny</span>
                <span className="font-medium text-gray-900">Po - Pá</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Čas</span>
                <span className="font-medium text-gray-900">09:00 - 17:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Prodleva</span>
                <span className="font-medium text-gray-900">120 - 300s</span>
              </div>
            </div>
            <button className="mt-4 w-full py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded hover:bg-gray-50 transition-colors">
              Upravit nastavení
            </button>
          </div>
        </div>

        {/* Right Area - Editor */}
        <div className="lg:col-span-9">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[600px]">
            {/* Editor Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
              <div className="flex items-center gap-4">
                <h2 className="font-semibold text-gray-900">
                  Editace: Krok {steps.findIndex(s => s.id === activeStepId) + 1}
                </h2>
                {steps.findIndex(s => s.id === activeStepId) > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Odeslat po</span>
                    <input 
                      type="number" 
                      min="1"
                      value={activeStep.delayDays}
                      onChange={(e) => updateStep(activeStep.id, 'delayDays', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <span className="text-gray-500">dnech</span>
                  </div>
                )}
              </div>
              {steps.length > 1 && (
                <button 
                  onClick={() => removeStep(activeStep.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Smazat krok"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Editor Body */}
            <div className="flex-1 flex flex-col p-6 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Předmět</label>
                <input 
                  type="text" 
                  value={activeStep.subject}
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
                      onClick={() => insertTag('{{jmeno}}')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      <Users className="w-3 h-3" /> {'{{jmeno}}'}
                    </button>
                    <button 
                      onClick={() => insertTag('{{firma}}')}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                    >
                      <Users className="w-3 h-3" /> {'{{firma}}'}
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
                  value={activeStep.body}
                  onChange={(e) => updateStep(activeStep.id, 'body', e.target.value)}
                  placeholder="Napište zprávu... Použijte tlačítka výše pro vložení proměnných."
                  className="flex-1 w-full p-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-mono text-sm leading-relaxed text-gray-800"
                />
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 items-start">
                <Wand2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 leading-relaxed">
                  <strong>Tip pro doručitelnost:</strong> Používejte Spintax syntaxi <code className="bg-blue-100 px-1 rounded text-blue-900">{'{Varianta A|Varianta B}'}</code> pro vytvoření unikátního obsahu v každém odeslaném e-mailu. Tím výrazně snížíte riziko pádu do spamu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
