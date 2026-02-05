 import { useState, useCallback } from 'react';
 import { useDateFilter } from '@/contexts/DateFilterContext';
 import { format } from 'date-fns';
 import { v4 as uuidv4 } from 'uuid';
 import { supabase } from '@/integrations/supabase/client';
 
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
   isError?: boolean;
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
       content: 'Olá! 👋 Sou o assistente da Gráfica NBL.\n\nVocê pode me perguntar sobre:\n• Financeiro (receitas, despesas, resultado)\n• Pedidos (status, clientes, faturamento)\n• Relatórios e análises',
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
 
       // Call edge function proxy
       const { data, error } = await supabase.functions.invoke('nlq-proxy', {
         body: payload,
       });
 
       if (error) {
         console.error('[useChatbot] Edge function error:', error);
         throw new Error(error.message || 'Erro ao conectar com o assistente.');
       }
 
       const response = data as ChatResponse;
 
       if (response.ok && response.reply) {
         const assistantMessage: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: response.reply.text,
           timestamp: new Date(),
           highlights: response.reply.highlights,
           suggestedActions: response.reply.suggested_actions,
           chartPayloads: response.reply.chart_payloads,
         };
         setMessages(prev => [...prev, assistantMessage]);
       } else {
         const errorMessage: Message = {
           id: (Date.now() + 1).toString(),
           role: 'assistant',
           content: response.error?.message || 'Desculpe, não consegui processar sua pergunta. Tente novamente.',
           timestamp: new Date(),
           isError: true,
         };
         setMessages(prev => [...prev, errorMessage]);
       }
     } catch (error) {
       console.error('[useChatbot] Error:', error);
       const errorText = error instanceof Error 
         ? error.message 
         : 'Desculpe, houve um erro ao processar sua pergunta. Tente novamente.';
 
       const errorMessage: Message = {
         id: (Date.now() + 1).toString(),
         role: 'assistant',
         content: errorText,
         timestamp: new Date(),
         isError: true,
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