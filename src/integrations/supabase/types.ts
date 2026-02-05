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
      etl_rejections: {
        Row: {
          created_at: string
          id: string
          legacy_pk: string | null
          payload: Json | null
          reason: string
          run_id: string
          table_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          legacy_pk?: string | null
          payload?: Json | null
          reason: string
          run_id: string
          table_name: string
        }
        Update: {
          created_at?: string
          id?: string
          legacy_pk?: string | null
          payload?: Json | null
          reason?: string
          run_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_etl_rejections_run_id"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "etl_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      etl_runs: {
        Row: {
          counts: Json | null
          error: string | null
          finished_at: string | null
          run_date: string | null
          run_id: string
          source: string | null
          started_at: string
          status: string
        }
        Insert: {
          counts?: Json | null
          error?: string | null
          finished_at?: string | null
          run_date?: string | null
          run_id?: string
          source?: string | null
          started_at?: string
          status: string
        }
        Update: {
          counts?: Json | null
          error?: string | null
          finished_at?: string | null
          run_date?: string | null
          run_id?: string
          source?: string | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      etl_snapshots: {
        Row: {
          finished_at: string | null
          id: number
          note: string | null
          row_counts: Json | null
          started_at: string
          status: string
        }
        Insert: {
          finished_at?: string | null
          id?: never
          note?: string | null
          row_counts?: Json | null
          started_at?: string
          status?: string
        }
        Update: {
          finished_at?: string | null
          id?: never
          note?: string | null
          row_counts?: Json | null
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      is_apps_whatsapp_msgs: {
        Row: {
          id: string
          mensagem: string
          tipo: string
        }
        Insert: {
          id?: string
          mensagem: string
          tipo: string
        }
        Update: {
          id?: string
          mensagem?: string
          tipo?: string
        }
        Relationships: []
      }
      is_arquivos: {
        Row: {
          bucket: string | null
          caminho: string | null
          data: string | null
          data_modificado: string | null
          extensao: string | null
          id: string
          identificacao: string | null
          idf: string | null
          idr: string | null
          json: string | null
          nome: string | null
          status: number | null
          tamanho: number | null
          tipo: string | null
          url_base: string | null
        }
        Insert: {
          bucket?: string | null
          caminho?: string | null
          data?: string | null
          data_modificado?: string | null
          extensao?: string | null
          id?: string
          identificacao?: string | null
          idf?: string | null
          idr?: string | null
          json?: string | null
          nome?: string | null
          status?: number | null
          tamanho?: number | null
          tipo?: string | null
          url_base?: string | null
        }
        Update: {
          bucket?: string | null
          caminho?: string | null
          data?: string | null
          data_modificado?: string | null
          extensao?: string | null
          id?: string
          identificacao?: string | null
          idf?: string | null
          idr?: string | null
          json?: string | null
          nome?: string | null
          status?: number | null
          tamanho?: number | null
          tipo?: string | null
          url_base?: string | null
        }
        Relationships: []
      }
      is_bancos: {
        Row: {
          agencia: string
          banco: string
          cc: string
          cp: string
          cpf_cnpj: string
          id: string
          operador: string
          titular: string
        }
        Insert: {
          agencia: string
          banco: string
          cc: string
          cp: string
          cpf_cnpj: string
          id?: string
          operador: string
          titular: string
        }
        Update: {
          agencia?: string
          banco?: string
          cc?: string
          cp?: string
          cpf_cnpj?: string
          id?: string
          operador?: string
          titular?: string
        }
        Relationships: []
      }
      is_clientes: {
        Row: {
          celular: string | null
          created_at: string
          email_log: string
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
      is_config: {
        Row: {
          id: string
          nome: string
          valor: string | null
        }
        Insert: {
          id?: string
          nome: string
          valor?: string | null
        }
        Update: {
          id?: string
          nome?: string
          valor?: string | null
        }
        Relationships: []
      }
      is_config_logs_curl: {
        Row: {
          created_at: string | null
          destino: string
          duracao: string | null
          id: string
          metodo: string
          requisicao_cabecalho: string | null
          requisicao_corpo: string | null
          retorno_cabecalho: string | null
          retorno_corpo: string | null
          retorno_status: string | null
          servidor_detalhes: string | null
        }
        Insert: {
          created_at?: string | null
          destino: string
          duracao?: string | null
          id?: string
          metodo: string
          requisicao_cabecalho?: string | null
          requisicao_corpo?: string | null
          retorno_cabecalho?: string | null
          retorno_corpo?: string | null
          retorno_status?: string | null
          servidor_detalhes?: string | null
        }
        Update: {
          created_at?: string | null
          destino?: string
          duracao?: string | null
          id?: string
          metodo?: string
          requisicao_cabecalho?: string | null
          requisicao_corpo?: string | null
          retorno_cabecalho?: string | null
          retorno_corpo?: string | null
          retorno_status?: string | null
          servidor_detalhes?: string | null
        }
        Relationships: []
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
      is_entregas_fretes_produtos: {
        Row: {
          frete_id: string
          produto_id: string
        }
        Insert: {
          frete_id: string
          produto_id: string
        }
        Update: {
          frete_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_entregas_fretes_produtos_frete_id"
            columns: ["frete_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_fretes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_entregas_fretes_produtos_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
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
      is_financeiro_caixas: {
        Row: {
          abertura_data: string | null
          abertura_descricao: string | null
          abertura_valor: number
          fechamento_data: string | null
          fechamento_descricao: string | null
          fechamento_json: string | null
          fechamento_valor: number | null
          id: string
          operador_id: string | null
          pdv_id: string | null
          status: number
        }
        Insert: {
          abertura_data?: string | null
          abertura_descricao?: string | null
          abertura_valor: number
          fechamento_data?: string | null
          fechamento_descricao?: string | null
          fechamento_json?: string | null
          fechamento_valor?: number | null
          id?: string
          operador_id?: string | null
          pdv_id?: string | null
          status: number
        }
        Update: {
          abertura_data?: string | null
          abertura_descricao?: string | null
          abertura_valor?: number
          fechamento_data?: string | null
          fechamento_descricao?: string | null
          fechamento_json?: string | null
          fechamento_valor?: number | null
          id?: string
          operador_id?: string | null
          pdv_id?: string | null
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_caixas_operador_id"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_caixas_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_caixas_movimentacoes: {
        Row: {
          caixa_id: string
          created_at: string | null
          descricao: string | null
          forma: string | null
          id: string
          tipo: number
          valor: number
        }
        Insert: {
          caixa_id: string
          created_at?: string | null
          descricao?: string | null
          forma?: string | null
          id?: string
          tipo: number
          valor: number
        }
        Update: {
          caixa_id?: string
          created_at?: string | null
          descricao?: string | null
          forma?: string | null
          id?: string
          tipo?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_caixas_movimentacoes_caixa_id"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_caixas"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_carteiras: {
        Row: {
          id: string
          saldo_inicial: number
          tipo: number
          titulo: string
        }
        Insert: {
          id?: string
          saldo_inicial?: number
          tipo: number
          titulo: string
        }
        Update: {
          id?: string
          saldo_inicial?: number
          tipo?: number
          titulo?: string
        }
        Relationships: []
      }
      is_financeiro_categorias: {
        Row: {
          arquivado: boolean | null
          cor: string | null
          id: string
          titulo: string
        }
        Insert: {
          arquivado?: boolean | null
          cor?: string | null
          id?: string
          titulo: string
        }
        Update: {
          arquivado?: boolean | null
          cor?: string | null
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      is_financeiro_centros_custo: {
        Row: {
          id: string
          titulo: string
        }
        Insert: {
          id?: string
          titulo: string
        }
        Update: {
          id?: string
          titulo?: string
        }
        Relationships: []
      }
      is_financeiro_conciliacoes: {
        Row: {
          arquivo: string | null
          arquivo_id: string | null
          conta: string | null
          data: string | null
          id: string
        }
        Insert: {
          arquivo?: string | null
          arquivo_id?: string | null
          conta?: string | null
          data?: string | null
          id?: string
        }
        Update: {
          arquivo?: string | null
          arquivo_id?: string | null
          conta?: string | null
          data?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_conciliacoes_arquivo_id"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "is_arquivos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_fornecedores: {
        Row: {
          arquivado: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          email_log: string | null
          estado: string | null
          id: string
          ie: string | null
          logradouro: string | null
          nome: string | null
          numero: string | null
          obs: string | null
          razao_social: string | null
          sobrenome: string | null
          telefone: string | null
          tipo: string | null
        }
        Insert: {
          arquivado?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email_log?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          obs?: string | null
          razao_social?: string | null
          sobrenome?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Update: {
          arquivado?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email_log?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          obs?: string | null
          razao_social?: string | null
          sobrenome?: string | null
          telefone?: string | null
          tipo?: string | null
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
            foreignKeyName: "fk_is_financeiro_lancamentos_anexo_arquivo_id"
            columns: ["anexo_arquivo_id"]
            isOneToOne: false
            referencedRelation: "is_arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_caixa_id"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_caixas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_carteira_id"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_carteiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_categoria_id"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_centro_custo_id"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_fornecedor_id"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_funcionario_id"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
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
      is_financeiro_notasfiscais: {
        Row: {
          arquivo: string | null
          arquivo_id: string | null
          chave: string | null
          created_at: string | null
          emissao: string | null
          fornecedor_id: string
          id: string
          json: string | null
          nf: string
          saida: string | null
          serie: string | null
          transportadora_id: string | null
          valor: number
        }
        Insert: {
          arquivo?: string | null
          arquivo_id?: string | null
          chave?: string | null
          created_at?: string | null
          emissao?: string | null
          fornecedor_id: string
          id?: string
          json?: string | null
          nf: string
          saida?: string | null
          serie?: string | null
          transportadora_id?: string | null
          valor: number
        }
        Update: {
          arquivo?: string | null
          arquivo_id?: string | null
          chave?: string | null
          created_at?: string | null
          emissao?: string | null
          fornecedor_id?: string
          id?: string
          json?: string | null
          nf?: string
          saida?: string | null
          serie?: string | null
          transportadora_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_notasfiscais_arquivo_id"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "is_arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_notasfiscais_fornecedor_id"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_notasfiscais_transportadora_id"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_transportadoras"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_pdvs: {
        Row: {
          bairro: string | null
          bling_id: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          logradouro: string | null
          telefone: string | null
          titulo: string
        }
        Insert: {
          bairro?: string | null
          bling_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          telefone?: string | null
          titulo: string
        }
        Update: {
          bairro?: string | null
          bling_id?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          logradouro?: string | null
          telefone?: string | null
          titulo?: string
        }
        Relationships: []
      }
      is_financeiro_repeticoes: {
        Row: {
          carteira_id: string
          categoria_id: string
          centro_custo_id: string | null
          created_at: string | null
          descricao: string | null
          fornecedor_id: string | null
          funcionario_id: string | null
          id: string
          obs: string | null
          pdv_id: string | null
          repeticao: number
          tipo: number
          valor: number
          vendedor_id: string | null
        }
        Insert: {
          carteira_id: string
          categoria_id: string
          centro_custo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          obs?: string | null
          pdv_id?: string | null
          repeticao: number
          tipo: number
          valor: number
          vendedor_id?: string | null
        }
        Update: {
          carteira_id?: string
          categoria_id?: string
          centro_custo_id?: string | null
          created_at?: string | null
          descricao?: string | null
          fornecedor_id?: string | null
          funcionario_id?: string | null
          id?: string
          obs?: string | null
          pdv_id?: string | null
          repeticao?: number
          tipo?: number
          valor?: number
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_carteira_id"
            columns: ["carteira_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_carteiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_categoria_id"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_centro_custo_id"
            columns: ["centro_custo_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_centros_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_fornecedor_id"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_funcionario_id"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_vendedor_id"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_repeticoes_criadas: {
        Row: {
          created_at: string | null
          id: string
          repeticao_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          repeticao_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          repeticao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_repeticoes_criadas_repeticao_id"
            columns: ["repeticao_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_repeticoes"
            referencedColumns: ["id"]
          },
        ]
      }
      is_financeiro_transportadoras: {
        Row: {
          arquivado: boolean | null
          bairro: string | null
          celular: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          complemento: string | null
          cpf: string | null
          created_at: string | null
          email_log: string | null
          estado: string | null
          id: string
          ie: string | null
          logradouro: string | null
          nome: string | null
          numero: string | null
          razao_social: string | null
          sobrenome: string | null
          telefone: string | null
          tipo: string | null
        }
        Insert: {
          arquivado?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email_log?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          razao_social?: string | null
          sobrenome?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Update: {
          arquivado?: boolean | null
          bairro?: string | null
          celular?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          complemento?: string | null
          cpf?: string | null
          created_at?: string | null
          email_log?: string | null
          estado?: string | null
          id?: string
          ie?: string | null
          logradouro?: string | null
          nome?: string | null
          numero?: string | null
          razao_social?: string | null
          sobrenome?: string | null
          telefone?: string | null
          tipo?: string | null
        }
        Relationships: []
      }
      is_mensagens: {
        Row: {
          assunto: string
          id: string
          mensagem: string
          placeholders: string | null
          prefixo: string
        }
        Insert: {
          assunto: string
          id?: string
          mensagem: string
          placeholders?: string | null
          prefixo: string
        }
        Update: {
          assunto?: string
          id?: string
          mensagem?: string
          placeholders?: string | null
          prefixo?: string
        }
        Relationships: []
      }
      is_mkt_banners: {
        Row: {
          id: string
          imagem: string
          imagem_mobile: string | null
          link: string | null
          local: string
          target: number
        }
        Insert: {
          id?: string
          imagem: string
          imagem_mobile?: string | null
          link?: string | null
          local: string
          target: number
        }
        Update: {
          id?: string
          imagem?: string
          imagem_mobile?: string | null
          link?: string | null
          local?: string
          target?: number
        }
        Relationships: []
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
      is_paginas: {
        Row: {
          conteudo: string
          id: string
          meta_description: string | null
          meta_title: string | null
          redirect_301: string | null
          slug: string
          titulo: string
        }
        Insert: {
          conteudo: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          redirect_301?: string | null
          slug: string
          titulo: string
        }
        Update: {
          conteudo?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          redirect_301?: string | null
          slug?: string
          titulo?: string
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
            foreignKeyName: "fk_is_pedidos_caixa_id"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_caixas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "fk_is_pedidos_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
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
      is_pedidos_fretes_detalhes_enderecos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          destinatario_documento: string | null
          destinatario_nome: string | null
          destinatario_pais: string | null
          destinatario_tipo: string | null
          detalhe_id: string
          estado: string | null
          id: string
          logradouro: string | null
          numero: string | null
          pedido_id: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          destinatario_documento?: string | null
          destinatario_nome?: string | null
          destinatario_pais?: string | null
          destinatario_tipo?: string | null
          detalhe_id: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          pedido_id: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          destinatario_documento?: string | null
          destinatario_nome?: string | null
          destinatario_pais?: string | null
          destinatario_tipo?: string | null
          detalhe_id?: string
          estado?: string | null
          id?: string
          logradouro?: string | null
          numero?: string | null
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_enderecos_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_enderecos_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_detalhes_parsed"
            referencedColumns: ["detalhe_id"]
          },
          {
            foreignKeyName: "fk_enderecos_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_enderecos_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_pedidos_fretes_detalhes_itens: {
        Row: {
          altura: number | null
          comprimento: number | null
          created_at: string | null
          detalhe_id: string
          entrega: string | null
          gratis: boolean | null
          id: string
          item_idx: number
          largura: number | null
          lc: number | null
          legacy_produto_id: string | null
          pedido_id: string
          peso: string | null
          quantidade: number | null
          valor_declarado: number | null
          volumes: number | null
        }
        Insert: {
          altura?: number | null
          comprimento?: number | null
          created_at?: string | null
          detalhe_id: string
          entrega?: string | null
          gratis?: boolean | null
          id?: string
          item_idx: number
          largura?: number | null
          lc?: number | null
          legacy_produto_id?: string | null
          pedido_id: string
          peso?: string | null
          quantidade?: number | null
          valor_declarado?: number | null
          volumes?: number | null
        }
        Update: {
          altura?: number | null
          comprimento?: number | null
          created_at?: string | null
          detalhe_id?: string
          entrega?: string | null
          gratis?: boolean | null
          id?: string
          item_idx?: number
          largura?: number | null
          lc?: number | null
          legacy_produto_id?: string | null
          pedido_id?: string
          peso?: string | null
          quantidade?: number | null
          valor_declarado?: number | null
          volumes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_itens_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_fretes_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itens_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: false
            referencedRelation: "v_pedidos_fretes_detalhes_parsed"
            referencedColumns: ["detalhe_id"]
          },
          {
            foreignKeyName: "fk_itens_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_itens_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_pedidos_fretes_detalhes_pacotes: {
        Row: {
          created_at: string | null
          detalhe_id: string
          id: string
          itens_count: number | null
          pacote_altura: number | null
          pacote_comprimento: number | null
          pacote_largura: number | null
          pacote_peso: number | null
          pacote_produtos: number | null
          pacote_produtos_ids: Json | null
          pacote_valor_declarado: number | null
          pacote_volumes: number | null
          pedido_id: string
        }
        Insert: {
          created_at?: string | null
          detalhe_id: string
          id?: string
          itens_count?: number | null
          pacote_altura?: number | null
          pacote_comprimento?: number | null
          pacote_largura?: number | null
          pacote_peso?: number | null
          pacote_produtos?: number | null
          pacote_produtos_ids?: Json | null
          pacote_valor_declarado?: number | null
          pacote_volumes?: number | null
          pedido_id: string
        }
        Update: {
          created_at?: string | null
          detalhe_id?: string
          id?: string
          itens_count?: number | null
          pacote_altura?: number | null
          pacote_comprimento?: number | null
          pacote_largura?: number | null
          pacote_peso?: number | null
          pacote_produtos?: number | null
          pacote_produtos_ids?: Json | null
          pacote_valor_declarado?: number | null
          pacote_volumes?: number | null
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_pacotes_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_detalhes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pacotes_detalhe"
            columns: ["detalhe_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_detalhes_parsed"
            referencedColumns: ["detalhe_id"]
          },
          {
            foreignKeyName: "fk_pacotes_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pacotes_pedido"
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
            foreignKeyName: "fk_entregas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entregas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_envios_parsed"
            referencedColumns: ["id"]
          },
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
      is_pedidos_fretes_envios: {
        Row: {
          detalhes_json: Json | null
          id: string
          pedido_id: string | null
          tipo: string | null
        }
        Insert: {
          detalhes_json?: Json | null
          id?: string
          pedido_id?: string | null
          tipo?: string | null
        }
        Update: {
          detalhes_json?: Json | null
          id?: string
          pedido_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_fretes_envios_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_fretes_envios_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      is_pedidos_fretes_retiradas: {
        Row: {
          balcao_bairro: string | null
          balcao_cep: string | null
          balcao_complemento: string | null
          balcao_id: string | null
          balcao_logradouro: string | null
          balcao_telefone: string | null
          balcao_titulo: string | null
          cidade: string | null
          created_at: string | null
          data_snapshot: string | null
          envio_id: string | null
          estado: string | null
          id: string
          pedido_id: string
          prazo_dias: number | null
        }
        Insert: {
          balcao_bairro?: string | null
          balcao_cep?: string | null
          balcao_complemento?: string | null
          balcao_id?: string | null
          balcao_logradouro?: string | null
          balcao_telefone?: string | null
          balcao_titulo?: string | null
          cidade?: string | null
          created_at?: string | null
          data_snapshot?: string | null
          envio_id?: string | null
          estado?: string | null
          id?: string
          pedido_id: string
          prazo_dias?: number | null
        }
        Update: {
          balcao_bairro?: string | null
          balcao_cep?: string | null
          balcao_complemento?: string | null
          balcao_id?: string | null
          balcao_logradouro?: string | null
          balcao_telefone?: string | null
          balcao_titulo?: string | null
          cidade?: string | null
          created_at?: string | null
          data_snapshot?: string | null
          envio_id?: string | null
          estado?: string | null
          id?: string
          pedido_id?: string
          prazo_dias?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_retiradas_balcao"
            columns: ["balcao_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_balcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_envios_parsed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_pedido"
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
          id: string
          item_id: string | null
          obs: string | null
          pedido_id: string | null
          status_id: number | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id?: string | null
          obs?: string | null
          pedido_id?: string | null
          status_id?: number | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string
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
      is_pedidos_itens_brief_alteracoes: {
        Row: {
          created_at: string
          frente: string | null
          id: string
          item_id: string
          verso: string | null
        }
        Insert: {
          created_at?: string
          frente?: string | null
          id?: string
          item_id: string
          verso?: string | null
        }
        Update: {
          created_at?: string
          frente?: string | null
          id?: string
          item_id?: string
          verso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_brief_alteracoes_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens_brief_conversa: {
        Row: {
          anexo: string | null
          created_at: string
          id: string
          item_id: string
          mensagem: string
          operador_id: string | null
          origem: number | null
          visto: boolean
        }
        Insert: {
          anexo?: string | null
          created_at?: string
          id?: string
          item_id: string
          mensagem: string
          operador_id?: string | null
          origem?: number | null
          visto?: boolean
        }
        Update: {
          anexo?: string | null
          created_at?: string
          id?: string
          item_id?: string
          mensagem?: string
          operador_id?: string | null
          origem?: number | null
          visto?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_brief_conversa_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_brief_conversa_operador_id"
            columns: ["operador_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens_briefings: {
        Row: {
          anexos_raw: string | null
          aprovacao: string | null
          cores: string | null
          created_at: string
          id: string
          info: string | null
          item_id: string
          nome_empresa: string | null
          rede_social: string | null
          site: string | null
          sobre: string | null
          visto: boolean
          visual: string | null
        }
        Insert: {
          anexos_raw?: string | null
          aprovacao?: string | null
          cores?: string | null
          created_at?: string
          id?: string
          info?: string | null
          item_id: string
          nome_empresa?: string | null
          rede_social?: string | null
          site?: string | null
          sobre?: string | null
          visto?: boolean
          visual?: string | null
        }
        Update: {
          anexos_raw?: string | null
          aprovacao?: string | null
          cores?: string | null
          created_at?: string
          id?: string
          info?: string | null
          item_id?: string
          nome_empresa?: string | null
          rede_social?: string | null
          site?: string | null
          sobre?: string | null
          visto?: boolean
          visual?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_briefings_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens_briefings_anexos: {
        Row: {
          arquivo_id: string
          item_id: string
        }
        Insert: {
          arquivo_id: string
          item_id: string
        }
        Update: {
          arquivo_id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_briefings_anexos_arquivo_id"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "is_arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_briefings_anexos_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
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
      is_pedidos_itens_servicos: {
        Row: {
          item_id: string
          servico_id: string
        }
        Insert: {
          item_id: string
          servico_id: string
        }
        Update: {
          item_id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_servicos_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_servicos_servico_id"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_itens_vars: {
        Row: {
          item_id: string
          produto_id: string
          produto_var_id: string
        }
        Insert: {
          item_id: string
          produto_id: string
          produto_var_id: string
        }
        Update: {
          item_id?: string
          produto_id?: string
          produto_var_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_itens_vars_item_id_produto_id"
            columns: ["item_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_itens"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_itens_vars_produto_var_id_produto_id"
            columns: ["produto_var_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_vars"
            referencedColumns: ["id", "produto_id"]
          },
        ]
      }
      is_pedidos_orcamentos: {
        Row: {
          acrescimo: number
          cliente_id: string | null
          created_at: string
          desconto: number
          frete_balcao_id: string | null
          frete_endereco_id: string | null
          frete_tipo: string | null
          frete_valor: number
          id: string
          json: string | null
          nome: string | null
          obs: string | null
          pdv_id: string | null
          pedido_ref: string | null
          sinal: number
          status: number | null
          subtotal: number | null
          total: number | null
          usuario_id: string | null
          vencimento: string | null
        }
        Insert: {
          acrescimo?: number
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          frete_balcao_id?: string | null
          frete_endereco_id?: string | null
          frete_tipo?: string | null
          frete_valor?: number
          id?: string
          json?: string | null
          nome?: string | null
          obs?: string | null
          pdv_id?: string | null
          pedido_ref?: string | null
          sinal?: number
          status?: number | null
          subtotal?: number | null
          total?: number | null
          usuario_id?: string | null
          vencimento?: string | null
        }
        Update: {
          acrescimo?: number
          cliente_id?: string | null
          created_at?: string
          desconto?: number
          frete_balcao_id?: string | null
          frete_endereco_id?: string | null
          frete_tipo?: string | null
          frete_valor?: number
          id?: string
          json?: string | null
          nome?: string | null
          obs?: string | null
          pdv_id?: string | null
          pedido_ref?: string | null
          sinal?: number
          status?: number | null
          subtotal?: number | null
          total?: number | null
          usuario_id?: string | null
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_frete_balcao_id"
            columns: ["frete_balcao_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_balcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_frete_endereco_id"
            columns: ["frete_endereco_id"]
            isOneToOne: false
            referencedRelation: "is_clientes_enderecos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_orcamentos_fretes_detalhes: {
        Row: {
          conteudo: string | null
          endereco: string | null
          id: string
          orcamento_id: string | null
        }
        Insert: {
          conteudo?: string | null
          endereco?: string | null
          id?: string
          orcamento_id?: string | null
        }
        Update: {
          conteudo?: string | null
          endereco?: string | null
          id?: string
          orcamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_fretes_detalhes_orcamento_id"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_orcamentos_fretes_envios: {
        Row: {
          detalhes: string | null
          id: string
          orcamento_id: string | null
          tipo: string | null
        }
        Insert: {
          detalhes?: string | null
          id?: string
          orcamento_id?: string | null
          tipo?: string | null
        }
        Update: {
          detalhes?: string | null
          id?: string
          orcamento_id?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_fretes_envios_orcamento_id"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_orcamentos_itens: {
        Row: {
          arte_arquivo: string | null
          arte_data: string | null
          arte_nome: string | null
          arte_status: number | null
          arte_tipo: string | null
          arte_valor: number
          created_at: string
          descricao: string | null
          formato: string | null
          formato_detalhes: string | null
          id: string
          json: string | null
          orcamento_id: string
          produto_detalhes: string | null
          produto_id: string | null
          qtde: number
          valor: number
          vars_detalhes: string | null
          vars_raw: string | null
        }
        Insert: {
          arte_arquivo?: string | null
          arte_data?: string | null
          arte_nome?: string | null
          arte_status?: number | null
          arte_tipo?: string | null
          arte_valor?: number
          created_at?: string
          descricao?: string | null
          formato?: string | null
          formato_detalhes?: string | null
          id?: string
          json?: string | null
          orcamento_id: string
          produto_detalhes?: string | null
          produto_id?: string | null
          qtde: number
          valor: number
          vars_detalhes?: string | null
          vars_raw?: string | null
        }
        Update: {
          arte_arquivo?: string | null
          arte_data?: string | null
          arte_nome?: string | null
          arte_status?: number | null
          arte_tipo?: string | null
          arte_valor?: number
          created_at?: string
          descricao?: string | null
          formato?: string | null
          formato_detalhes?: string | null
          id?: string
          json?: string | null
          orcamento_id?: string
          produto_detalhes?: string | null
          produto_id?: string | null
          qtde?: number
          valor?: number
          vars_detalhes?: string | null
          vars_raw?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_orcamento_id"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_orcamentos_itens_servicos: {
        Row: {
          item_id: string
          servico_id: string
        }
        Insert: {
          item_id: string
          servico_id: string
        }
        Update: {
          item_id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_servicos_item_id"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos_itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_servicos_servico_id"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_pedidos_orcamentos_itens_vars: {
        Row: {
          item_id: string
          produto_id: string
          produto_var_id: string
        }
        Insert: {
          item_id: string
          produto_id: string
          produto_var_id: string
        }
        Update: {
          item_id?: string
          produto_id?: string
          produto_var_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_vars_item_id_produto_id"
            columns: ["item_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos_itens"
            referencedColumns: ["id", "produto_id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_itens_vars_produto_var_id_produto_id"
            columns: ["produto_var_id", "produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_vars"
            referencedColumns: ["id", "produto_id"]
          },
        ]
      }
      is_pedidos_orcamentos_pagamentos: {
        Row: {
          cliente_id: string
          condicao: string | null
          created_at: string
          data_pagto: string | null
          forma: string
          id: string
          link: string | null
          obs: string | null
          orcamento_id: string
          pdv_id: string | null
          status: number
          usuario_id: string | null
          valor: number
          vencimento: string | null
        }
        Insert: {
          cliente_id: string
          condicao?: string | null
          created_at?: string
          data_pagto?: string | null
          forma: string
          id?: string
          link?: string | null
          obs?: string | null
          orcamento_id: string
          pdv_id?: string | null
          status: number
          usuario_id?: string | null
          valor: number
          vencimento?: string | null
        }
        Update: {
          cliente_id?: string
          condicao?: string | null
          created_at?: string
          data_pagto?: string | null
          forma?: string
          id?: string
          link?: string | null
          obs?: string | null
          orcamento_id?: string
          pdv_id?: string | null
          status?: number
          usuario_id?: string | null
          valor?: number
          vencimento?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_pagamentos_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_pagamentos_orcamento_id"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos_orcamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_pagamentos_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_orcamentos_pagamentos_usuario_id"
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
            foreignKeyName: "fk_is_pedidos_pagamentos_caixa_id"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_caixas"
            referencedColumns: ["id"]
          },
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
            foreignKeyName: "fk_is_pedidos_pagamentos_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
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
      is_produtos_avaliacoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          depoimento: string
          foto: string | null
          id: string
          nota: number
          produto_id: string
          status: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          depoimento: string
          foto?: string | null
          id?: string
          nota: number
          produto_id: string
          status?: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          depoimento?: string
          foto?: string | null
          id?: string
          nota?: number
          produto_id?: string
          status?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_avaliacoes_cliente_id"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "is_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_avaliacoes_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
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
      is_produtos_categorias_produtos: {
        Row: {
          categoria_id: string
          produto_id: string
        }
        Insert: {
          categoria_id: string
          produto_id: string
        }
        Update: {
          categoria_id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_categorias_produtos_categoria_id"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_categorias_produtos_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_dem: {
        Row: {
          ate: number
          de: number
          id: string
          preco_unit: number
          produto_id: string
        }
        Insert: {
          ate: number
          de: number
          id?: string
          preco_unit: number
          produto_id: string
        }
        Update: {
          ate?: number
          de?: number
          id?: string
          preco_unit?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_dem_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_dem_info: {
        Row: {
          a: number
          c: number
          l: number
          peso: string | null
          produto_id: string
        }
        Insert: {
          a: number
          c: number
          l: number
          peso?: string | null
          produto_id: string
        }
        Update: {
          a?: number
          c?: number
          l?: number
          peso?: string | null
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_dem_info_produto_id"
            columns: ["produto_id"]
            isOneToOne: true
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_fixo: {
        Row: {
          a: number | null
          alternativo: number | null
          c: number | null
          id: string
          l: number | null
          peso: string | null
          preco_anterior: number | null
          preco_atual: number
          produto_id: string
        }
        Insert: {
          a?: number | null
          alternativo?: number | null
          c?: number | null
          id?: string
          l?: number | null
          peso?: string | null
          preco_anterior?: number | null
          preco_atual: number
          produto_id: string
        }
        Update: {
          a?: number | null
          alternativo?: number | null
          c?: number | null
          id?: string
          l?: number | null
          peso?: string | null
          preco_anterior?: number | null
          preco_atual?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_fixo_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_fixo_regras: {
        Row: {
          apartir: number
          desconto_tipo: number
          desconto_valor: number
          id: string
          produto_id: string
        }
        Insert: {
          apartir: number
          desconto_tipo: number
          desconto_valor: number
          id?: string
          produto_id: string
        }
        Update: {
          apartir?: number
          desconto_tipo?: number
          desconto_valor?: number
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_fixo_regras_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_imagens: {
        Row: {
          arquivo_id: string
          id: string
          is_principal: boolean
          ordem: number
          produto_id: string
        }
        Insert: {
          arquivo_id: string
          id?: string
          is_principal?: boolean
          ordem?: number
          produto_id: string
        }
        Update: {
          arquivo_id?: string
          id?: string
          is_principal?: boolean
          ordem?: number
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_imagens_arquivo_id"
            columns: ["arquivo_id"]
            isOneToOne: false
            referencedRelation: "is_arquivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_imagens_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_mt: {
        Row: {
          a: number | null
          altura_max: number | null
          c: number | null
          embalagem: boolean | null
          encaixe: number | null
          id: string
          individual: boolean | null
          l: number | null
          largura_max: number | null
          larguras: string | null
          mt_c_menor: number | null
          peso: string | null
          preco_metro: number
          preco_min: number
          produto_id: string
          tipo: boolean | null
        }
        Insert: {
          a?: number | null
          altura_max?: number | null
          c?: number | null
          embalagem?: boolean | null
          encaixe?: number | null
          id?: string
          individual?: boolean | null
          l?: number | null
          largura_max?: number | null
          larguras?: string | null
          mt_c_menor?: number | null
          peso?: string | null
          preco_metro: number
          preco_min: number
          produto_id: string
          tipo?: boolean | null
        }
        Update: {
          a?: number | null
          altura_max?: number | null
          c?: number | null
          embalagem?: boolean | null
          encaixe?: number | null
          id?: string
          individual?: boolean | null
          l?: number | null
          largura_max?: number | null
          larguras?: string | null
          mt_c_menor?: number | null
          peso?: string | null
          preco_metro?: number
          preco_min?: number
          produto_id?: string
          tipo?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_mt_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_mt_regras: {
        Row: {
          apartir: number
          desconto_tipo: number
          desconto_valor: number
          id: string
          produto_id: string
        }
        Insert: {
          apartir: number
          desconto_tipo: number
          desconto_valor: number
          id?: string
          produto_id: string
        }
        Update: {
          apartir?: number
          desconto_tipo?: number
          desconto_valor?: number
          id?: string
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_mt_regras_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_offset: {
        Row: {
          id: string
          incremento: string | null
          preco_base: number
          produto_id: string | null
          qtde: number
        }
        Insert: {
          id?: string
          incremento?: string | null
          preco_base: number
          produto_id?: string | null
          qtde: number
        }
        Update: {
          id?: string
          incremento?: string | null
          preco_base?: number
          produto_id?: string | null
          qtde?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_offset_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_qtd: {
        Row: {
          a: number | null
          c: number | null
          id: string
          l: number | null
          peso: string | null
          preco_anterior: number | null
          preco_atual: number
          produto_id: string
          qtde: string
        }
        Insert: {
          a?: number | null
          c?: number | null
          id?: string
          l?: number | null
          peso?: string | null
          preco_anterior?: number | null
          preco_atual: number
          produto_id: string
          qtde: string
        }
        Update: {
          a?: number | null
          c?: number | null
          id?: string
          l?: number | null
          peso?: string | null
          preco_anterior?: number | null
          preco_atual?: number
          produto_id?: string
          qtde?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_qtd_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_relacoes: {
        Row: {
          produto_id: string
          produto_relacionado_id: string
          tipo_relacao: string
        }
        Insert: {
          produto_id: string
          produto_relacionado_id: string
          tipo_relacao: string
        }
        Update: {
          produto_id?: string
          produto_relacionado_id?: string
          tipo_relacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_relacoes_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_relacoes_produto_relacionado_id"
            columns: ["produto_relacionado_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_servicos: {
        Row: {
          descricao: string | null
          detalhes: string | null
          id: string
          nome: string
          valor: number
        }
        Insert: {
          descricao?: string | null
          detalhes?: string | null
          id?: string
          nome: string
          valor?: number
        }
        Update: {
          descricao?: string | null
          detalhes?: string | null
          id?: string
          nome?: string
          valor?: number
        }
        Relationships: []
      }
      is_produtos_servicos_vinculos: {
        Row: {
          produto_id: string
          servico_id: string
        }
        Insert: {
          produto_id: string
          servico_id: string
        }
        Update: {
          produto_id?: string
          servico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_servicos_vinculos_produto_id"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "is_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_produtos_servicos_vinculos_servico_id"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "is_produtos_servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      is_produtos_skus: {
        Row: {
          created_at: string | null
          id: string
          produto_id: string
          sku: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          produto_id: string
          sku: string
        }
        Update: {
          created_at?: string | null
          id?: string
          produto_id?: string
          sku?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_produtos_skus_produto"
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
          {
            foreignKeyName: "fk_is_usuarios_pdv_id"
            columns: ["pdv_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_pdvs"
            referencedColumns: ["id"]
          },
        ]
      }
      is_usuarios_acessos: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip: string
          navegador: string | null
          sessao_antiga: string | null
          sessao_nova: string | null
          usuario_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip: string
          navegador?: string | null
          sessao_antiga?: string | null
          sessao_nova?: string | null
          usuario_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip?: string
          navegador?: string | null
          sessao_antiga?: string | null
          sessao_nova?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_usuarios_acessos_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
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
      is_usuarios_paginas: {
        Row: {
          pagina_id: string
          usuario_id: string
        }
        Insert: {
          pagina_id: string
          usuario_id: string
        }
        Update: {
          pagina_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_usuarios_paginas_pagina_id"
            columns: ["pagina_id"]
            isOneToOne: false
            referencedRelation: "is_paginas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_usuarios_paginas_usuario_id"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "is_usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      is_usuarios_tentativas: {
        Row: {
          created_at: string | null
          email: string
          id: string
          ip: string
          navegador: string | null
          senha: string | null
          sessao: string | null
          time: number | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          ip: string
          navegador?: string | null
          senha?: string | null
          sessao?: string | null
          time?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          ip?: string
          navegador?: string | null
          senha?: string | null
          sessao?: string | null
          time?: number | null
        }
        Relationships: []
      }
      is_visitas: {
        Row: {
          data: string | null
          id: string
          pageviews: number
          visitas: number
        }
        Insert: {
          data?: string | null
          id?: string
          pageviews: number
          visitas: number
        }
        Update: {
          data?: string | null
          id?: string
          pageviews?: number
          visitas?: number
        }
        Relationships: []
      }
      is_visitas_online: {
        Row: {
          fim: string | null
          id: string
          id_session: string
          inicio: string | null
          ip: string | null
          navegador: string | null
          origem: string | null
          pageviews: number
          url: string | null
        }
        Insert: {
          fim?: string | null
          id?: string
          id_session: string
          inicio?: string | null
          ip?: string | null
          navegador?: string | null
          origem?: string | null
          pageviews: number
          url?: string | null
        }
        Update: {
          fim?: string | null
          id?: string
          id_session?: string
          inicio?: string | null
          ip?: string | null
          navegador?: string | null
          origem?: string | null
          pageviews?: number
          url?: string | null
        }
        Relationships: []
      }
      raw_text_overrides: {
        Row: {
          column_name: string
          pk_json: Json
          raw_bytes: string
          table_name: string
        }
        Insert: {
          column_name: string
          pk_json: Json
          raw_bytes: string
          table_name: string
        }
        Update: {
          column_name?: string
          pk_json?: Json
          raw_bytes?: string
          table_name?: string
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
            foreignKeyName: "fk_entregas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_entregas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_envios_parsed"
            referencedColumns: ["id"]
          },
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
      v_pedidos_fretes_detalhes_parsed: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          destinatario_documento: string | null
          destinatario_nome: string | null
          destinatario_tipo: string | null
          detalhe_id: string | null
          estado: string | null
          itens_count: number | null
          logradouro: string | null
          numero: string | null
          pacote_altura: number | null
          pacote_comprimento: number | null
          pacote_largura: number | null
          pacote_peso: number | null
          pacote_valor_declarado: number | null
          pacote_volumes: number | null
          pedido_id: string | null
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
      v_pedidos_fretes_envios_parsed: {
        Row: {
          cidade: string | null
          detalhes_json: Json | null
          estado: string | null
          id: string | null
          modulo: string | null
          pedido_id: string | null
          prazo_dias: number | null
          sucesso: boolean | null
          tipo: string | null
          titulo: string | null
          valor: number | null
        }
        Insert: {
          cidade?: never
          detalhes_json?: Json | null
          estado?: never
          id?: string | null
          modulo?: never
          pedido_id?: string | null
          prazo_dias?: never
          sucesso?: never
          tipo?: string | null
          titulo?: never
          valor?: never
        }
        Update: {
          cidade?: never
          detalhes_json?: Json | null
          estado?: never
          id?: string | null
          modulo?: never
          pedido_id?: string | null
          prazo_dias?: never
          sucesso?: never
          tipo?: string | null
          titulo?: never
          valor?: never
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_pedidos_fretes_envios_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_is_pedidos_fretes_envios_pedido_id"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      v_pedidos_retiradas: {
        Row: {
          balcao_id: string | null
          balcao_telefone: string | null
          balcao_titulo: string | null
          cidade: string | null
          envio_id: string | null
          estado: string | null
          id: string | null
          pedido_created_at: string | null
          pedido_id: string | null
          prazo_dias: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_retiradas_balcao"
            columns: ["balcao_id"]
            isOneToOne: false
            referencedRelation: "is_entregas_balcoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "is_pedidos_fretes_envios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_envio"
            columns: ["envio_id"]
            isOneToOne: true
            referencedRelation: "v_pedidos_fretes_envios_parsed"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "is_pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_retiradas_pedido"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_pedidos"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      vw_dashboard_financeiro: {
        Row: {
          categoria: string | null
          categoria_id: string | null
          data: string | null
          descricao: string | null
          id: string | null
          status: string | null
          tipo: string | null
          valor: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_is_financeiro_lancamentos_categoria_id"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "is_financeiro_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_dashboard_pedidos: {
        Row: {
          cliente_id: string | null
          cliente_nome: string | null
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
    }
    Functions: {
      cleanup_text: { Args: { raw_text: string }; Returns: string }
      get_finance_kpis: {
        Args: { end_date: string; start_date: string }
        Returns: Json
      }
      get_snapshot_meta: { Args: never; Returns: Json }
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
