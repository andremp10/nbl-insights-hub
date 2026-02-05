 import { useState, useCallback } from 'react';
 import { useDateFilter } from '@/contexts/DateFilterContext';
 import { format } from 'date-fns';
 import { v4 as uuidv4 } from 'uuid';
 
 const WEBHOOK_URL = 'https://chez-n8n-webhook.jsf0kc.easypanel.host/webhook/4831bc34-510b-46f1-a3e5-96299a45fab6';
 
 export interface ChatHighlight {
   label: string;
   value: number;
 }
 
 export interface SuggestedAction {
   type: 'set_date_range' | 'open_module';
   from?: string;
   to?: string;
   module?: string;
 }
 
 export interface ChartPayload {
   chart: string;
   title: string;
   series: { name: string; value: number }[];
 }
 
 export interface ChatResponse {
   ok: boolean;
   reply?: {
     text: string;
     highlights?: ChatHighlight[];
     suggested_actions?: SuggestedAction[];
     chart_payloads?: ChartPayload[];
   };
   error?: {
     code: string;
     message: string;
   };
 }
 
 export interface Message {
   id: string;
   role: 'user' | 'assistant';
   content: string;
   timestamp: Date;
   highlights?: ChatHighlight[];
   suggestedActions?: SuggestedAction[];
   chartPayloads?: ChartPayload[];
 }
 
 // Session ID persists across page reloads
 const SESSION_ID = localStorage.getItem('nbl_chat_session') || (() => {
   const id = uuidv4();
   localStorage.setItem('nbl_chat_session', id);
   return id;
 })();
 
 export function useChatbot() {
   const { dateRange } = useDateFilter();
   const [messages, setMessages] = useState<Message[]>([
     {
       id: '1',
       role: 'assistant',
       content: 'Olá! 👋 Sou o assistente da Gráfica NBL. Você pode me perguntar sobre financeiro, vendas, pedidos e muito mais. Por exemplo:\n\n• "Qual foi o faturamento do mês?"\n• "Quais são os principais gastos?"\n• "Quantos pedidos estão em produção?"',
       timestamp: new Date(),
     },
   ]);
   const [isLoading, setIsLoading] = useState(false);
 
   const sendMessage = useCallback(async (content: string): Promise<void> => {
     if (!content.trim() || isLoading) return;
 
     const userMessage: Message = {
       id: Date.now().toString(),
       role: 'user',
       content: content.trim(),
       timestamp: new Date(),
     };
 
     setMessages(prev => [...prev, userMessage]);
     setIsLoading(true);
 
     try {
       const payload = {
         app: 'grafica_nbl_lovable',
         session_id: SESSION_ID,
         timezone: 'America/Fortaleza',
         message: content.trim(),
         context: {
           date_range: {
             from: format(dateRange.from, 'yyyy-MM-dd'),
             to: format(dateRange.to, 'yyyy-MM-dd'),
           },
           active_module: 'dashboard',
         },
       };
 
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
 
       const response = await fetch(WEBHOOK_URL, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify(payload),
         signal: controller.signal,
       });
 
       clearTimeout(timeoutId);
 
       if (!response.ok) {
         throw new Error(`HTTP error: ${response.status}`);
       }
 
       const data: ChatResponse = await response.json();
 
       if (data.ok && data.reply) {
         const assistantMessage: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: data.reply.text,
           timestamp: new Date(),
           highlights: data.reply.highlights,
           suggestedActions: data.reply.suggested_actions,
           chartPayloads: data.reply.chart_payloads,
         };
         setMessages(prev => [...prev, assistantMessage]);
       } else {
         const errorMessage: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: data.error?.message || 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
           timestamp: new Date(),
         };
         setMessages(prev => [...prev, errorMessage]);
       }
     } catch (error) {
       let errorText = 'Desculpe, houve um erro ao processar sua pergunta. Tente novamente.';
       
       if (error instanceof Error) {
         if (error.name === 'AbortError') {
           errorText = 'O assistente está demorando para responder. Por favor, tente novamente.';
         }
       }
 
       const errorMessage: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: errorText,
         timestamp: new Date(),
       };
       setMessages(prev => [...prev, errorMessage]);
     } finally {
       setIsLoading(false);
     }
   }, [dateRange, isLoading]);
 
   const clearMessages = useCallback(() => {
     setMessages([
       {
         id: '1',
         role: 'assistant',
         content: 'Olá! 👋 Conversa reiniciada. Como posso ajudar?',
         timestamp: new Date(),
       },
     ]);
   }, []);
 
   return {
     messages,
     isLoading,
     sendMessage,
     clearMessages,
   };
 }