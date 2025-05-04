"use client"

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Check, Copy, Code, CheckCircle2, Sun, Moon } from "lucide-react";
import { languageConverters } from '../utils/converters';
import { useTheme } from "next-themes";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CodeEditor = dynamic(
  () => import('@uiw/react-textarea-code-editor').then((mod) => mod.default),
  { ssr: false }
);

type Language = 'typescript' | 'python' | 'go' | 'rust';
type OutputView = 'single' | 'all';

const JsonToStruct: React.FC = () => {
const [jsonInput, setJsonInput] = useState('');

  const [selectedLang, setSelectedLang] = useState<Language>('typescript');
  const [outputs, setOutputs] = useState<Record<Language, string>>({
    typescript: '',
    python: '',
    go: '',
    rust: ''
  });
  const [error, setError] = useState('');
  const [outputView, setOutputView] = useState<OutputView>('single');
  const [copied, setCopied] = useState<Record<Language, boolean>>({
    typescript: false,
    python: false,
    go: false,
    rust: false
  });
  const { theme, setTheme } = useTheme();

  const cleanupJson = (input: string): string => {
    try {
      JSON.parse(input);
      return input;
    } catch (e) {
      let cleaned = input;
      
      cleaned = cleaned.replace(/^\s*(export\s+)?(const|let|var)\s+\w+\s*=\s*/, '');
      
      cleaned = cleaned.replace(/;(\s*)$/, '$1');
      
      cleaned = cleaned.replace(/'/g, '"');
      
      cleaned = cleaned.replace(/(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
      
      try {
        JSON.parse(cleaned);
        return cleaned;
      } catch (e2) {
        throw e;
      }
    }
  };

  const debouncedConvert = useCallback(
    (input: string) => {
      try {
        if (!input.trim()) {
          setOutputs({
            typescript: '',
            python: '',
            go: '',
            rust: ''
          });
          setError('');
          return;
        }
        
        const cleanedJson = cleanupJson(input);
        
        const parsedJson = JSON.parse(cleanedJson);
        
        const newOutputs = Object.keys(languageConverters).reduce((acc, lang) => {
          const typedLang = lang as Language;
          try {
            acc[typedLang] = languageConverters[typedLang](cleanedJson);
          } catch (err) {
            acc[typedLang] = `Error: Could not convert to ${lang}`;
          }
          return acc;
        }, {} as Record<Language, string>);
        
        setOutputs(newOutputs);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Invalid JSON input');
        setOutputs({
          typescript: '',
          python: '',
          go: '',
          rust: ''
        });
      }
    },
    []
  );

  useEffect(() => {
    debouncedConvert(jsonInput);
  }, [jsonInput, debouncedConvert]);

  useEffect(() => {
    const updateHeight = () => {
      const mainContainer = document.getElementById('editors-container');
      if (mainContainer) {
        const viewHeight = window.innerHeight;
        const containerTop = mainContainer.getBoundingClientRect().top;
        const newHeight = viewHeight - containerTop - 40;
        mainContainer.style.height = `${newHeight}px`;
      }
    };

    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const handleConvert = () => {
    debouncedConvert(jsonInput);
  };

  const copyToClipboard = (language: Language) => {
    navigator.clipboard.writeText(outputs[language]);
    setCopied(prev => ({ ...prev, [language]: true }));
    
    setTimeout(() => {
      setCopied(prev => ({ ...prev, [language]: false }));
    }, 2000);
  };

  const renderLanguageTabs = () => (
    <Tabs defaultValue={selectedLang} onValueChange={(value) => setSelectedLang(value as Language)}>
      <TabsList className="grid grid-cols-4 mb-2">
        <TabsTrigger value="typescript">TypeScript</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
        <TabsTrigger value="go">Go</TabsTrigger>
        <TabsTrigger value="rust">Rust</TabsTrigger>
      </TabsList>
      
      {(['typescript', 'python', 'go', 'rust'] as Language[]).map(lang => (
        <TabsContent key={lang} value={lang} className="relative">
          <div className="absolute right-2 top-2 z-10">
            <Button 
              size="sm" 
              variant="ghost"
              onClick={() => copyToClipboard(lang)}
              disabled={!outputs[lang]}
            >
              {copied[lang] ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <div className="border rounded-md overflow-hidden bg-[#1e1e1e] dark:bg-[#0d1117] h-full">
            <div className="overflow-auto" style={{ maxHeight: 'calc(100% - 10px)' }}>
              <CodeEditor
                value={outputs[lang]}
                language={lang}
                readOnly
                padding={15}
                className="w-full"
                style={{
                  fontSize: 14,
                  backgroundColor: theme === 'dark' ? '#0d1117' : '#f6f8fa',
                  fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                  minHeight: '300px',
                  color: theme === 'dark' ? '#e6edf3' : '#24292f',
                }}
                data-color-mode={theme === 'dark' ? 'dark' : 'light'}
              />
            </div>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );

  const renderAllLanguages = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-auto max-h-[calc(100vh-250px)]">
      {(['typescript', 'python', 'go', 'rust'] as Language[]).map(lang => (
        <Card key={lang} className="overflow-hidden">
          <CardHeader className="py-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-medium">{lang.charAt(0).toUpperCase() + lang.slice(1)}</CardTitle>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyToClipboard(lang)}
                disabled={!outputs[lang]}
                className="h-8 w-8 p-0"
              >
                {copied[lang] ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 border-t">
            <div className="overflow-auto" style={{ maxHeight: '200px' }}>
              <CodeEditor
                value={outputs[lang]}
                language={lang}
                readOnly
                padding={15}
                className="w-full"
                style={{
                  fontSize: 14,
                  backgroundColor: theme === 'dark' ? '#0d1117' : '#f6f8fa',
                  fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                  minHeight: '200px',
                  color: theme === 'dark' ? '#e6edf3' : '#24292f',
                }}
                data-color-mode={theme === 'dark' ? 'dark' : 'light'}
              />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="w-full flex flex-col bg-background text-foreground">
      <Card className="mb-6 border bg-card text-card-foreground">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold">
              <div className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                JSON to Struct Converter
              </div>
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="output-view"
                  checked={outputView === 'all'}
                  onCheckedChange={() => setOutputView(outputView === 'single' ? 'all' : 'single')}
                />
                <Label htmlFor="output-view">Show all languages</Label>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Toggle theme</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div id="editors-container" className="flex flex-col md:flex-row w-full gap-4 overflow-hidden">
        <Card className="flex-1 min-w-0 border bg-card text-card-foreground">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Input JSON</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md overflow-hidden">
              <CodeEditor
                value={jsonInput}
                language="json"
                placeholder="Enter your JSON here (or JavaScript objects like 'export const data = {...}')"
                onChange={(e) => setJsonInput(e.target.value)}
                padding={15}
                className="w-full overflow-auto"
                style={{
                  fontSize: 14,
                  backgroundColor: theme === 'dark' ? '#0d1117' : '#1e1e1e',
                  fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                  minHeight: '350px',
                }}
                data-color-mode={theme === 'dark' ? 'dark' : 'dark'}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-0 overflow-hidden border bg-card text-card-foreground">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Output Structure</CardTitle>
          </CardHeader>
          <CardContent className="overflow-hidden">
            <div className="overflow-hidden" style={{ height: 'calc(100% - 10px)' }}>
              {outputView === 'single' ? renderLanguageTabs() : renderAllLanguages()}
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4">
        <Button 
          onClick={handleConvert} 
          className="flex items-center gap-2"
          variant="default"
          size="lg"
        >
          <Code className="h-4 w-4" /> Convert
        </Button>
      </div>
    </div>
  );
};

export default JsonToStruct;