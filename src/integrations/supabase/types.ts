export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          auth_user_id: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          role: string
          status: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          role?: string
          status?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          client_request_id: string | null
          completed_at: string | null
          content: string
          created_at: string
          dispatch_ack_timeout: boolean | null
          error_detail: string | null
          id: string
          processing_started_at: string | null
          reply_to_message_id: string | null
          request_id: string | null
          role: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          client_request_id?: string | null
          completed_at?: string | null
          content?: string
          created_at?: string
          dispatch_ack_timeout?: boolean | null
          error_detail?: string | null
          id?: string
          processing_started_at?: string | null
          reply_to_message_id?: string | null
          request_id?: string | null
          role: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          client_request_id?: string | null
          completed_at?: string | null
          content?: string
          created_at?: string
          dispatch_ack_timeout?: boolean | null
          error_detail?: string | null
          id?: string
          processing_started_at?: string | null
          reply_to_message_id?: string | null
          request_id?: string | null
          role?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      etl_error_logs: {
        Row: {
          created_at: string
          details: Json
          error_class: string | null
          event_type: string
          id: string
          legacy_id: string | null
          message: string
          phase: string | null
          probable_constraint: string | null
          run_id: string
          script_name: string
          severity: string
          step_name: string | null
          table_name: string | null
          traceback: string | null
        }
        Insert: {
          created_at?: string
          details?: Json
          error_class?: string | null
          event_type: string
          id?: string
          legacy_id?: string | null
          message: string
          phase?: string | null
          probable_constraint?: string | null
          run_id: string
          script_name: string
          severity?: string
          step_name?: string | null
          table_name?: string | null
          traceback?: string | null
        }
        Update: {
          created_at?: string
          details?: Json
          error_class?: string | null
          event_type?: string
          id?: string
          legacy_id?: string | null
          message?: string
          phase?: string | null
          probable_constraint?: string | null
          run_id?: string
          script_name?: string
          severity?: string
          step_name?: string | null
          table_name?: string | null
          traceback?: string | null
        }
        Relationships: []
      }
      is_clientes: {
        Row: {
          celular: string | null
          created_at: string
          email_log: string
          erp_id: number | null
          id: string
          ip: string | null
          logotipo: string | null
          pagarme_id: string | null
          pdv: number | null
          retirada: number | null
          retirada_limite: number | null
          revendedor: number | null
          saldo: number
          senha_log: string | null
          status: number
          telefone: string | null
          tipo: string
          ultimo_acesso: string | null
          wpp_verificado: string | null
        }
        Insert: {
          celular?: string | null
          created_at?: string
          email_log: string
          erp_id?: number | null
          id?: string
          ip?: string | null
          logotipo?: string | null
          pagarme_id?: string | null
          pdv?: number | null
          retirada?: number | null
          retirada_limite?: number | null
          revendedor?: number | null
          saldo?: number
          senha_log?: string | null
          status?: number
          telefone?: string | null
          tipo: string
          ultimo_acesso?: string | null
          wpp_verificado?: string | null
        }
        Update: {
          celular?: string | null
          created_at?: string
          email_log?: string
          erp_id?: number | null
          id?: string
          ip?: string | null
          logotipo?: string | null
          pagarme_id?: string | null
          pdv?: number | null
          retirada?: number | null
          retirada_limite?: number | null
          revendedor?: number | null
          saldo?: number
          senha_log?: string | null
          status?: number
          telefone?: string | null
          tipo?: string
          ultimo_acesso?: string | null
          wpp_verificado?: string | null
        }
        Relationships: []
      }
      is_clientes_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string | null
          complemento: string | null
          created_at: string
          estado: string | null
          id: string
          is_principal: boolean
          logradouro: string | null
          numero: string | null
          titulo: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean
          logradouro?: string | null
          numero?: string | null
          titulo?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string | null
          complemento?: string | null
          created_at?: string
          estado?: string | null
          id?: string
          is_principal?: boolean
          logradouro?: string | null
          numero?: string | null
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_clientes_enderecos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_clientes_extratos: {
        Row: {
          cliente_id: string | null
          created_at: string | null
          descricao: string | null
          id: string
          obs: string | null
          pagamento_id: string | null
          pedido_id: string | null
          saldo_antes: number
          saldo_depois: number
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          obs?: string | null
          pagamento_id?: string | null
          pedido_id?: string | null
          saldo_antes: number
          saldo_depois: number
          valor: number
        }
        Update: {
          cliente_id?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          obs?: string | null
          pagamento_id?: string | null
          pedido_id?: string | null
          saldo_antes?: number
          saldo_depois?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_clientes_extratos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_clientes_extratos_pagamento_id"
            columns: ["pagamento_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_clientes_extratos_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_clientes_extratos_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_clientes_pf: {
        Row: {
          cliente_id: string
          cpf: string | null
          nascimento: string | null
          nome: string | null
          sexo: string | null
          sobrenome: string | null
        }
        Insert: {
          cliente_id: string
          cpf?: string | null
          nascimento?: string | null
          nome?: string | null
          sexo?: string | null
          sobrenome?: string | null
        }
        Update: {
          cliente_id?: string
          cpf?: string | null
          nascimento?: string | null
          nome?: string | null
          sexo?: string | null
          sobrenome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_clientes_pf_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_clientes_pj: {
        Row: {
          cliente_id: string
          cnpj: string | null
          fantasia: string | null
          ie: string | null
          razao_social: string | null
        }
        Insert: {
          cliente_id: string
          cnpj?: string | null
          fantasia?: string | null
          ie?: string | null
          razao_social?: string | null
        }
        Update: {
          cliente_id?: string
          cnpj?: string | null
          fantasia?: string | null
          ie?: string | null
          razao_social?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_clientes_pj_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: true
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_entregas_balcoes: {
        Row: {
          arquivado: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          custo: number
          estado: string | null
          id: string
          logradouro: string | null
          prazo: string | null
          telefone: string | null
          titulo: string
        }
        Insert: {
          arquivado?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          custo: number
          estado?: string | null
          id?: string
          logradouro?: string | null
          prazo?: string | null
          telefone?: string | null
          titulo: string
        }
        Update: {
          arquivado?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          custo?: number
          estado?: string | null
          id?: string
          logradouro?: string | null
          prazo?: string | null
          telefone?: string | null
          titulo?: string
        }
        Relationships: []
      }
      is_entregas_fretes: {
        Row: {
          descricao: string | null
          id: string
          limite_c: number | null
          limite_peso: string | null
          max_km: string | null
          min_compra: number
          min_km: string | null
          minimo_c: number | null
          minimo_peso: string | null
          prazo: number | null
          taxa: number
          tipo: number
          titulo: string
        }
        Insert: {
          descricao?: string | null
          id?: string
          limite_c?: number | null
          limite_peso?: string | null
          max_km?: string | null
          min_compra?: number
          min_km?: string | null
          minimo_c?: number | null
          minimo_peso?: string | null
          prazo?: number | null
          taxa: number
          tipo: number
          titulo: string
        }
        Update: {
          descricao?: string | null
          id?: string
          limite_c?: number | null
          limite_peso?: string | null
          max_km?: string | null
          min_compra?: number
          min_km?: string | null
          minimo_c?: number | null
          minimo_peso?: string | null
          prazo?: number | null
          taxa?: number
          tipo?: number
          titulo?: string
        }
        Relationships: []
      }
      is_entregas_fretes_locais: {
        Row: {
          bairro: string | null
          cep_fim: string | null
          cep_inicio: string | null
          cidade: string | null
          estado: string | null
          frete_id: string
          id: string
        }
        Insert: {
          bairro?: string | null
          cep_fim?: string | null
          cep_inicio?: string | null
          cidade?: string | null
          estado?: string | null
          frete_id: string
          id?: string
        }
        Update: {
          bairro?: string | null
          cep_fim?: string | null
          cep_inicio?: string | null
          cidade?: string | null
          estado?: string | null
          frete_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_entregas_fretes_locais_frete_id"
            columns: ["frete_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_fretes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_extras_status: {
        Row: {
          id: number
          nome: string
          num: number | null
          visivel: number | null
        }
        Insert: {
          id: number
          nome: string
          num?: number | null
          visivel?: number | null
        }
        Update: {
          id?: number
          nome?: string
          num?: number | null
          visivel?: number | null
        }
        Relationships: []
      }
      is_financeiro_funcionarios: {
        Row: {
          admissao: string | null
          bairro: string | null
          cargo: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          cpf: string | null
          demissao: string | null
          erp_id: number | null
          estado: string | null
          id: string
          logradouro: string | null
          nascimento: string | null
          nome: string
          numero: string | null
          obs: string | null
          rg: string | null
          salario: number
          salario_vencimento: number | null
          sexo: string | null
          sobrenome: string | null
          telefone: string | null
          vale: number | null
          vale_vencimento: number | null
        }
        Insert: {
          admissao?: string | null
          bairro?: string | null
          cargo?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          demissao?: string | null
          erp_id?: number | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nascimento?: string | null
          nome: string
          numero?: string | null
          obs?: string | null
          rg?: string | null
          salario: number
          salario_vencimento?: number | null
          sexo?: string | null
          sobrenome?: string | null
          telefone?: string | null
          vale?: number | null
          vale_vencimento?: number | null
        }
        Update: {
          admissao?: string | null
          bairro?: string | null
          cargo?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          cpf?: string | null
          demissao?: string | null
          erp_id?: number | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          nascimento?: string | null
          nome?: string
          numero?: string | null
          obs?: string | null
          rg?: string | null
          salario?: number
          salario_vencimento?: number | null
          sexo?: string | null
          sobrenome?: string | null
          telefone?: string | null
          vale?: number | null
          vale_vencimento?: number | null
        }
        Relationships: []
      }
      is_financeiro_lancamentos: {
        Row: {
          agrupar: number | null
          anexo: string | null
          anexo_arquivo_id: string | null
          caixa_id: string | null
          carteira_id: string | null
          categoria_id: string | null
          centro_custo_id: string | null
          conciliacao: string | null
          conciliacao_movimentacao: number | null
          conciliacao_pagto: number | null
          data: string | null
          data_emissao: string | null
          data_pagto: string | null
          descricao: string | null
          erp_id: number | null
          fornecedor_id: string | null
          funcionario_id: string | null
          id: string
          neutro: number | null
          obs: string | null
          origem: number | null
          pdv_id: string | null
          repetir: number | null
          status: number
          tipo: number
          uid: string | null
          valor: number
          vendedor_id: string | null
        }
        Insert: {
          agrupar?: number | null
          anexo?: string | null
          anexo_arquivo_id?: string | null
          caixa_id?: string | null
          carteira_id?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          conciliacao?: string | null
          conciliacao_movimentacao?: number | null
          conciliacao_pagto?: number | null
          data?: string | null
          data_emissao?: string | null
          data_pagto?: string | null
          descricao?: string | null
          erp_id?: number | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          neutro?: number | null
          obs?: string | null
          origem?: number | null
          pdv_id?: string | null
          repetir?: number | null
          status: number
          tipo: number
          uid?: string | null
          valor: number
          vendedor_id?: string | null
        }
        Update: {
          agrupar?: number | null
          anexo?: string | null
          anexo_arquivo_id?: string | null
          caixa_id?: string | null
          carteira_id?: string | null
          categoria_id?: string | null
          centro_custo_id?: string | null
          conciliacao?: string | null
          conciliacao_movimentacao?: number | null
          conciliacao_pagto?: number | null
          data?: string | null
          data_emissao?: string | null
          data_pagto?: string | null
          descricao?: string | null
          erp_id?: number | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          neutro?: number | null
          obs?: string | null
          origem?: number | null
          pdv_id?: string | null
          repetir?: number | null
          status?: number
          tipo?: number
          uid?: string | null
          valor?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_funcionario_id"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_vendedor_id"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_mkt_cupons: {
        Row: {
          arquivado: boolean
          cliente_id: string | null
          codigo: string
          fim: string | null
          id: string
          inicio: string | null
          limite: number | null
          pedido_min: number
          primeira_compra: boolean
          tipo: string
          uso: number
          valor: number
        }
        Insert: {
          arquivado?: boolean
          cliente_id?: string | null
          codigo: string
          fim?: string | null
          id?: string
          inicio?: string | null
          limite?: number | null
          pedido_min?: number
          primeira_compra?: boolean
          tipo: string
          uso?: number
          valor: number
        }
        Update: {
          arquivado?: boolean
          cliente_id?: string | null
          codigo?: string
          fim?: string | null
          id?: string
          inicio?: string | null
          limite?: number | null
          pedido_min?: number
          primeira_compra?: boolean
          tipo?: string
          uso?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_mkt_cupons_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_mkt_cupons_produtos: {
        Row: {
          cupom_id: string
          produto_id: string
        }
        Insert: {
          cupom_id: string
          produto_id: string
        }
        Update: {
          cupom_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_mkt_cupons_produtos_cupom_id"
            columns: ["cupom_id"]
            isOneToOne: false
            referencedRelation: "is_mkt_cupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_mkt_cupons_produtos_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_mkt_regras: {
        Row: {
          created_at: string
          desconto: number
          id: string
          regra: string
          tipo: number
          uso: number
        }
        Insert: {
          created_at?: string
          desconto: number
          id?: string
          regra: string
          tipo: number
          uso?: number
        }
        Update: {
          created_at?: string
          desconto?: number
          id?: string
          regra?: string
          tipo?: number
          uso?: number
        }
        Relationships: []
      }
      is_pedidos: {
        Row: {
          acrescimo: number
          caixa_id: string | null
          cliente_id: string
          created_at: string
          cupom: string | null
          desconto: number
          desconto_uso: number
          devolucao_completa: boolean
          erp_id: number | null
          frete_balcao_id: string | null
          frete_endereco_id: string | null
          frete_rastreio: string | null
          frete_tipo: string | null
          frete_valor: number
          id: string
          json: string | null
          nf: string | null
          obs: string | null
          obs_interna: string | null
          origem: number | null
          pdv_id: string | null
          sinal: number
          total: number
          usuario_id: string | null
        }
        Insert: {
          acrescimo?: number
          caixa_id?: string | null
          cliente_id: string
          created_at?: string
          cupom?: string | null
          desconto?: number
          desconto_uso?: number
          devolucao_completa?: boolean
          erp_id?: number | null
          frete_balcao_id?: string | null
          frete_endereco_id?: string | null
          frete_rastreio?: string | null
          frete_tipo?: string | null
          frete_valor?: number
          id?: string
          json?: string | null
          nf?: string | null
          obs?: string | null
          obs_interna?: string | null
          origem?: number | null
          pdv_id?: string | null
          sinal?: number
          total: number
          usuario_id?: string | null
        }
        Update: {
          acrescimo?: number
          caixa_id?: string | null
          cliente_id?: string
          created_at?: string
          cupom?: string | null
          desconto?: number
          desconto_uso?: number
          devolucao_completa?: boolean
          erp_id?: number | null
          frete_balcao_id?: string | null
          frete_endereco_id?: string | null
          frete_rastreio?: string | null
          frete_tipo?: string | null
          frete_valor?: number
          id?: string
          json?: string | null
          nf?: string | null
          obs?: string | null
          obs_interna?: string | null
          origem?: number | null
          pdv_id?: string | null
          sinal?: number
          total?: number
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_cupom_codigo"
            columns: ["cupom"]
            isOneToOne: false
            referencedRelation: "is_mkt_cupons"
            referencedColumns: ["codigo"]
          },
          {
            foreignKeyName: "fk_is_pedidos_frete_balcao_id"
            columns: ["frete_balcao_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_balcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_frete_endereco_id"
            columns: ["frete_endereco_id"]
            isOneToOne: false
            referencedRelation: "is_clientes_enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_fretes_detalhes: {
        Row: {
          conteudo_json: Json | null
          endereco_json: Json | null
          id: string
          pedido_id: string
        }
        Insert: {
          conteudo_json?: Json | null
          endereco_json?: Json | null
          id?: string
          pedido_id: string
        }
        Update: {
          conteudo_json?: Json | null
          endereco_json?: Json | null
          id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_fretes_detalhes_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_fretes_detalhes_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_pedidos_fretes_entregas: {
        Row: {
          created_at: string | null
          descricao: string | null
          envio_id: string | null
          hash: string | null
          id: string
          metodo_titulo: string | null
          modulo: string | null
          pedido_id: string
          prazo_dias: number | null
          sucesso: boolean | null
          valor: number | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          envio_id?: string | null
          hash?: string | null
          id?: string
          metodo_titulo?: string | null
          modulo?: string | null
          pedido_id: string
          prazo_dias?: number | null
          sucesso?: boolean | null
          valor?: number | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          envio_id?: string | null
          hash?: string | null
          id?: string
          metodo_titulo?: string | null
          modulo?: string | null
          pedido_id?: string
          prazo_dias?: number | null
          sucesso?: boolean | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_entregas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entregas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_pedidos_historico: {
        Row: {
          created_at: string
          erp_id: number | null
          id: string
          item_id: string | null
          obs: string | null
          pedido_id: string | null
          status_id: number | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          erp_id?: number | null
          id?: string
          item_id?: string | null
          obs?: string | null
          pedido_id?: string | null
          status_id?: number | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          erp_id?: number | null
          id?: string
          item_id?: string | null
          obs?: string | null
          pedido_id?: string | null
          status_id?: number | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_historico_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_historico_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_historico_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_historico_status_id"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "is_extras_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_historico_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens: {
        Row: {
          arquivado: boolean
          arte_arquivo: string | null
          arte_data: string | null
          arte_nome: string | null
          arte_status: number | null
          arte_tipo: string | null
          arte_valor: number
          categoria: number | null
          created_at: string
          data_modificado: string | null
          descricao: string | null
          erp_id: number | null
          formato: string | null
          formato_detalhes: string | null
          ftp: string | null
          id: string
          json: string | null
          origem: number | null
          pago: boolean
          pedido_id: string
          previa: string | null
          previsao_entrega: string | null
          previsao_producao: string | null
          produto_detalhes: string | null
          produto_id: string | null
          qtde: number | null
          rastreio: string | null
          revendedor: number | null
          status: string | null
          valor: number | null
          vars_detalhes: string | null
          vars_raw: string | null
          visto: number | null
        }
        Insert: {
          arquivado?: boolean
          arte_arquivo?: string | null
          arte_data?: string | null
          arte_nome?: string | null
          arte_status?: number | null
          arte_tipo?: string | null
          arte_valor?: number
          categoria?: number | null
          created_at?: string
          data_modificado?: string | null
          descricao?: string | null
          erp_id?: number | null
          formato?: string | null
          formato_detalhes?: string | null
          ftp?: string | null
          id?: string
          json?: string | null
          origem?: number | null
          pago?: boolean
          pedido_id: string
          previa?: string | null
          previsao_entrega?: string | null
          previsao_producao?: string | null
          produto_detalhes?: string | null
          produto_id?: string | null
          qtde?: number | null
          rastreio?: string | null
          revendedor?: number | null
          status?: string | null
          valor?: number | null
          vars_detalhes?: string | null
          vars_raw?: string | null
          visto?: number | null
        }
        Update: {
          arquivado?: boolean
          arte_arquivo?: string | null
          arte_data?: string | null
          arte_nome?: string | null
          arte_status?: number | null
          arte_tipo?: string | null
          arte_valor?: number
          categoria?: number | null
          created_at?: string
          data_modificado?: string | null
          descricao?: string | null
          erp_id?: number | null
          formato?: string | null
          formato_detalhes?: string | null
          ftp?: string | null
          id?: string
          json?: string | null
          origem?: number | null
          pago?: boolean
          pedido_id?: string
          previa?: string | null
          previsao_entrega?: string | null
          previsao_producao?: string | null
          produto_detalhes?: string | null
          produto_id?: string | null
          qtde?: number | null
          rastreio?: string | null
          revendedor?: number | null
          status?: string | null
          valor?: number | null
          vars_detalhes?: string | null
          vars_raw?: string | null
          visto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens_reprovados: {
        Row: {
          created_at: string
          id: string
          item_id: string | null
          motivo: string
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          motivo: string
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string | null
          motivo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_reprovados_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_reprovados_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_pag_reprovados: {
        Row: {
          comprovante_id: string | null
          created_at: string
          id: string
          motivo: string
          usuario_id: string | null
        }
        Insert: {
          comprovante_id?: string | null
          created_at?: string
          id?: string
          motivo: string
          usuario_id?: string | null
        }
        Update: {
          comprovante_id?: string | null
          created_at?: string
          id?: string
          motivo?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_pag_reprovados_comprovante_id"
            columns: ["comprovante_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_pag_reprovados_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_pagamentos: {
        Row: {
          bandeira: string | null
          caixa_id: string | null
          cliente_id: string
          condicao: string | null
          created_at: string
          erp_id: number | null
          forma: string
          id: string
          link: string | null
          obs: string | null
          oculto: boolean
          original_id: string | null
          parcelas_qtd: number | null
          parcelas_raw: string | null
          pdv_id: string | null
          pedido_id: string | null
          saldo_anterior: number | null
          saldo_atual: number | null
          status: number
          uid: string | null
          usuario_id: string | null
          valor: number
          visto: boolean
        }
        Insert: {
          bandeira?: string | null
          caixa_id?: string | null
          cliente_id: string
          condicao?: string | null
          created_at?: string
          erp_id?: number | null
          forma: string
          id?: string
          link?: string | null
          obs?: string | null
          oculto?: boolean
          original_id?: string | null
          parcelas_qtd?: number | null
          parcelas_raw?: string | null
          pdv_id?: string | null
          pedido_id?: string | null
          saldo_anterior?: number | null
          saldo_atual?: number | null
          status: number
          uid?: string | null
          usuario_id?: string | null
          valor: number
          visto?: boolean
        }
        Update: {
          bandeira?: string | null
          caixa_id?: string | null
          cliente_id?: string
          condicao?: string | null
          created_at?: string
          erp_id?: number | null
          forma?: string
          id?: string
          link?: string | null
          obs?: string | null
          oculto?: boolean
          original_id?: string | null
          parcelas_qtd?: number | null
          parcelas_raw?: string | null
          pdv_id?: string | null
          pedido_id?: string | null
          saldo_anterior?: number | null
          saldo_atual?: number | null
          status?: number
          uid?: string | null
          usuario_id?: string | null
          valor?: number
          visto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_pagamentos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_pagamentos_original_id"
            columns: ["original_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_pagamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_pagamentos_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_pagamentos_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_pagamentos_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_producao_setores: {
        Row: {
          id: string
          nome: string
          status: string | null
        }
        Insert: {
          id?: string
          nome: string
          status?: string | null
        }
        Update: {
          id?: string
          nome?: string
          status?: string | null
        }
        Relationships: []
      }
      is_produtos: {
        Row: {
          acabamento: string | null
          arquivado: boolean
          arte: boolean
          brdraw: string | null
          categoria_relatorio: number | null
          cores: string | null
          created_at: string
          descricao_curta: string | null
          descricao_html: string | null
          entrega: string | null
          erp_id: number | null
          estoque_condicao: string | null
          estoque_controlar: boolean
          estoque_qtde: number
          extras: string | null
          formato: string | null
          gabarito: string | null
          gtin: string | null
          id: string
          material: string | null
          meta_description: string | null
          meta_title: string | null
          mostrar: string | null
          mpn: string | null
          ncm: string | null
          oferta_condicao: string | null
          oferta_expira: string | null
          prazo: string | null
          redirect_301: string | null
          revenda_desconto: number | null
          revenda_tipo: number | null
          revestimento: string | null
          selo: string | null
          sku: string | null
          titulo: string
          url: string | null
          valor: string | null
          valor_arte: number
          vars_agrupadas: number | null
          vars_combinacao: number | null
          vars_obrig: boolean | null
          vars_select: number | null
          vendidos: number
          video: string | null
          visivel: boolean
        }
        Insert: {
          acabamento?: string | null
          arquivado?: boolean
          arte?: boolean
          brdraw?: string | null
          categoria_relatorio?: number | null
          cores?: string | null
          created_at?: string
          descricao_curta?: string | null
          descricao_html?: string | null
          entrega?: string | null
          erp_id?: number | null
          estoque_condicao?: string | null
          estoque_controlar?: boolean
          estoque_qtde?: number
          extras?: string | null
          formato?: string | null
          gabarito?: string | null
          gtin?: string | null
          id?: string
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mostrar?: string | null
          mpn?: string | null
          ncm?: string | null
          oferta_condicao?: string | null
          oferta_expira?: string | null
          prazo?: string | null
          redirect_301?: string | null
          revenda_desconto?: number | null
          revenda_tipo?: number | null
          revestimento?: string | null
          selo?: string | null
          sku?: string | null
          titulo: string
          url?: string | null
          valor?: string | null
          valor_arte?: number
          vars_agrupadas?: number | null
          vars_combinacao?: number | null
          vars_obrig?: boolean | null
          vars_select?: number | null
          vendidos?: number
          video?: string | null
          visivel?: boolean
        }
        Update: {
          acabamento?: string | null
          arquivado?: boolean
          arte?: boolean
          brdraw?: string | null
          categoria_relatorio?: number | null
          cores?: string | null
          created_at?: string
          descricao_curta?: string | null
          descricao_html?: string | null
          entrega?: string | null
          erp_id?: number | null
          estoque_condicao?: string | null
          estoque_controlar?: boolean
          estoque_qtde?: number
          extras?: string | null
          formato?: string | null
          gabarito?: string | null
          gtin?: string | null
          id?: string
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          mostrar?: string | null
          mpn?: string | null
          ncm?: string | null
          oferta_condicao?: string | null
          oferta_expira?: string | null
          prazo?: string | null
          redirect_301?: string | null
          revenda_desconto?: number | null
          revenda_tipo?: number | null
          revestimento?: string | null
          selo?: string | null
          sku?: string | null
          titulo?: string
          url?: string | null
          valor?: string | null
          valor_arte?: number
          vars_agrupadas?: number | null
          vars_combinacao?: number | null
          vars_obrig?: boolean | null
          vars_select?: number | null
          vendidos?: number
          video?: string | null
          visivel?: boolean
        }
        Relationships: []
      }
      is_produtos_categorias: {
        Row: {
          chave: string | null
          descricao: string | null
          description: string | null
          id: string
          parent_id: string | null
          slug: string | null
          status: number
          title: string | null
          titulo: string
        }
        Insert: {
          chave?: string | null
          descricao?: string | null
          description?: string | null
          id?: string
          parent_id?: string | null
          slug?: string | null
          status?: number
          title?: string | null
          titulo: string
        }
        Update: {
          chave?: string | null
          descricao?: string | null
          description?: string | null
          id?: string
          parent_id?: string | null
          slug?: string | null
          status?: number
          title?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_categorias_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_categorias_extras: {
        Row: {
          categoria: string | null
          id: string
          produto_id: string
          secao: string | null
          subcategoria: string | null
          subsecao: string | null
          subsubsecao: string | null
        }
        Insert: {
          categoria?: string | null
          id?: string
          produto_id: string
          secao?: string | null
          subcategoria?: string | null
          subsecao?: string | null
          subsubsecao?: string | null
        }
        Update: {
          categoria?: string | null
          id?: string
          produto_id?: string
          secao?: string | null
          subcategoria?: string | null
          subsecao?: string | null
          subsubsecao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_categorias_extras_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_vars: {
        Row: {
          cobranca: number | null
          cobranca_val: number | null
          estoque: number | null
          foto: string | null
          grupo_id: string | null
          id: string
          nome: string | null
          opcao: string
          produto_id: string | null
          valor: number | null
        }
        Insert: {
          cobranca?: number | null
          cobranca_val?: number | null
          estoque?: number | null
          foto?: string | null
          grupo_id?: string | null
          id?: string
          nome?: string | null
          opcao: string
          produto_id?: string | null
          valor?: number | null
        }
        Update: {
          cobranca?: number | null
          cobranca_val?: number | null
          estoque?: number | null
          foto?: string | null
          grupo_id?: string | null
          id?: string
          nome?: string | null
          opcao?: string
          produto_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_vars_grupo_id"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_vars_nomes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_vars_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_vars_nomes: {
        Row: {
          id: string
          nome: string
          texto_exibicao: string | null
        }
        Insert: {
          id?: string
          nome: string
          texto_exibicao?: string | null
        }
        Update: {
          id?: string
          nome?: string
          texto_exibicao?: string | null
        }
        Relationships: []
      }
      is_usuarios: {
        Row: {
          acesso: number
          balcao_id: string | null
          comissao_tipo: number | null
          comissao_valor: number | null
          created_at: string
          email_log: string
          foto: string | null
          hora_ate: string | null
          hora_de: string | null
          id: string
          nome: string
          pdv_id: string | null
          senha_log: string
          sobrenome: string | null
          status: number
          ultimo_acesso: string | null
        }
        Insert: {
          acesso: number
          balcao_id?: string | null
          comissao_tipo?: number | null
          comissao_valor?: number | null
          created_at?: string
          email_log: string
          foto?: string | null
          hora_ate?: string | null
          hora_de?: string | null
          id?: string
          nome: string
          pdv_id?: string | null
          senha_log: string
          sobrenome?: string | null
          status?: number
          ultimo_acesso?: string | null
        }
        Update: {
          acesso?: number
          balcao_id?: string | null
          comissao_tipo?: number | null
          comissao_valor?: number | null
          created_at?: string
          email_log?: string
          foto?: string | null
          hora_ate?: string | null
          hora_de?: string | null
          id?: string
          nome?: string
          pdv_id?: string | null
          senha_log?: string
          sobrenome?: string | null
          status?: number
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_usuarios_balcao_id"
            columns: ["balcao_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_balcoes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_usuarios_historico: {
        Row: {
          acao: string | null
          cliente_id: string | null
          created_at: string | null
          id: string
          usuario_id: string | null
        }
        Insert: {
          acao?: string | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string | null
          cliente_id?: string | null
          created_at?: string | null
          id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_usuarios_historico_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_usuarios_historico_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      n8n_chat_histories: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_pedidos_entregas: {
        Row: {
          descricao: string | null
          envio_id: string | null
          id: string | null
          metodo_titulo: string | null
          modulo: string | null
          pedido_created_at: string | null
          pedido_id: string | null
          prazo_dias: number | null
          sucesso: boolean | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_entregas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entregas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      vw_chat_context: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          role: string | null
          session_id: string | null
          session_title: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_dashboard_pedidos: {
        Row: {
          cliente_celular: string | null
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          cliente_tipo: string | null
          data_criacao: string | null
          data_prazo_validada: string | null
          dias_em_atraso: number | null
          frete_valor: number | null
          is_atrasado: boolean | null
          is_finalizado: boolean | null
          pedido_id: string | null
          qtde_itens: number | null
          status_pedido: string | null
          valor_total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_schema_llm_guide: {
        Row: {
          approx_rows: number | null
          column_comment: string | null
          column_name: unknown
          data_type: string | null
          default_value: string | null
          fk_references_column: unknown
          fk_references_table: unknown
          is_primary_key: boolean | null
          nullable: string | null
          ordinal_position: number | null
          table_comment: string | null
          table_name: unknown
        }
        Relationships: []
      }
    }
    Functions: {
      cleanup_text: { Args: { raw_text: string }; Returns: string }
      create_chat_async_request: {
        Args: {
          p_client_request_id: string
          p_content: string
          p_session_id: string
        }
        Returns: {
          assistant_message_id: string
          assistant_status: string
          is_duplicate: boolean
          request_id: string
          user_message_id: string
        }[]
      }
      expire_stuck_processing_messages: { Args: never; Returns: number }
      get_finance_kpis: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_financeiro_graficos: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          categoria: string
          valor: number
        }[]
      }
      get_financeiro_kpis: {
        Args: { p_data_fim: string; p_data_inicio: string }
        Returns: {
          despesa: number
          receita: number
          resultado: number
        }[]
      }
      get_snapshot_meta: { Args: never; Returns: Json }
      is_master: { Args: { p_auth_id: string }; Returns: boolean }
      report_client_timeout: {
        Args: { p_assistant_id: string }
        Returns: undefined
      }
      try_parse_jsonb: { Args: { p_text: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
