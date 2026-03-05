DROP VIEW IF EXISTS public.vw_dashboard_pedidos CASCADE;

CREATE VIEW public.vw_dashboard_pedidos AS
SELECT p.id AS pedido_id,
    p.cliente_id,
    COALESCE(
      NULLIF(TRIM(BOTH FROM (COALESCE(pf.nome, ''::character varying)::text || ' '::text) || COALESCE(pf.sobrenome, ''::character varying)::text), ''::text),
      pj.razao_social::text,
      c.email_log::text,
      'Cliente #'::text || "left"(p.cliente_id::text, 8)
    ) AS cliente_nome,
    c.email_log::text AS cliente_email,
    c.telefone::text AS cliente_telefone,
    c.celular::text AS cliente_celular,
    c.tipo::text AS cliente_tipo,
    p.created_at AS data_criacao,
        CASE
            WHEN COALESCE(ai.data_entrega, ai.data_prazo) < '2010-01-01 00:00:00'::timestamp without time zone THEN NULL::timestamp without time zone
            ELSE COALESCE(ai.data_entrega, ai.data_prazo)
        END AS data_prazo_validada,
        CASE
            WHEN ai.status_agregado ~~* '%Entregue%'::text OR ai.status_agregado ~~* '%Retirado%'::text OR ai.status_agregado ~~* '%Finalizado%'::text OR ai.status_agregado ~~* '%Concluído%'::text OR ai.status_agregado ~~* '%Cancelado%'::text THEN 'Finalizado'::text
            WHEN ai.status_agregado ~~* '%Enviado%'::text OR ai.status_agregado ~~* '%Logística%'::text OR ai.status_agregado ~~* '%Serviço de Entrega%'::text THEN 'Enviado'::text
            WHEN ai.status_agregado ~~* '%Produção%'::text OR ai.status_agregado ~~* '%Impressão%'::text OR ai.status_agregado ~~* '%Acabamento%'::text OR ai.status_agregado ~~* '%Arquivo aprovado%'::text OR ai.status_agregado ~~* '%Cartão em Produção%'::text OR ai.status_agregado ~~* '%Pró-Solução%'::text THEN 'Em Produção'::text
            WHEN ai.status_agregado ~~* '%Reenviar%'::text OR ai.status_agregado ~~* '%fora do Padrão%'::text OR ai.status_agregado ~~* '%Pendencia%'::text OR ai.status_agregado ~~* '%Erro%'::text THEN 'Problema no Arquivo'::text
            ELSE 'Em Análise'::text
        END AS status_pedido,
    COALESCE(ai.qtde_itens, 0) AS qtde_itens,
    p.total AS valor_total,
    p.frete_valor,
        CASE
            WHEN ai.status_agregado ~~* '%Entregue%'::text OR ai.status_agregado ~~* '%Retirado%'::text OR ai.status_agregado ~~* '%Finalizado%'::text OR ai.status_agregado ~~* '%Concluído%'::text OR ai.status_agregado ~~* '%Cancelado%'::text THEN true
            ELSE false
        END AS is_finalizado,
        CASE
            WHEN COALESCE(ai.data_entrega, ai.data_prazo) >= '2010-01-01 00:00:00'::timestamp without time zone AND COALESCE(ai.data_entrega, ai.data_prazo) < CURRENT_TIMESTAMP AND NOT (ai.status_agregado ~~* '%Entregue%'::text OR ai.status_agregado ~~* '%Retirado%'::text OR ai.status_agregado ~~* '%Finalizado%'::text OR ai.status_agregado ~~* '%Concluído%'::text OR ai.status_agregado ~~* '%Cancelado%'::text) THEN true
            ELSE false
        END AS is_atrasado,
        CASE
            WHEN COALESCE(ai.data_entrega, ai.data_prazo) >= '2010-01-01 00:00:00'::timestamp without time zone AND COALESCE(ai.data_entrega, ai.data_prazo) < CURRENT_TIMESTAMP AND NOT (ai.status_agregado ~~* '%Entregue%'::text OR ai.status_agregado ~~* '%Retirado%'::text OR ai.status_agregado ~~* '%Finalizado%'::text OR ai.status_agregado ~~* '%Concluído%'::text OR ai.status_agregado ~~* '%Cancelado%'::text) THEN GREATEST(0, CURRENT_DATE - COALESCE(ai.data_entrega, ai.data_prazo)::date)
            ELSE 0
        END AS dias_em_atraso
   FROM is_pedidos p
     LEFT JOIN is_clientes c ON c.id = p.cliente_id
     LEFT JOIN is_clientes_pf pf ON pf.cliente_id = p.cliente_id
     LEFT JOIN is_clientes_pj pj ON pj.cliente_id = p.cliente_id
     LEFT JOIN LATERAL ( SELECT s.qtde_itens,
            s.data_prazo,
            s.data_entrega,
            s.status_agregado
           FROM ( SELECT count(*)::integer AS qtde_itens,
                    min(CASE WHEN i.previsao_producao < '2010-01-01 00:00:00'::timestamp without time zone THEN NULL::timestamp without time zone ELSE i.previsao_producao END) AS data_prazo,
                    max(CASE WHEN i.previsao_entrega < '2010-01-01 00:00:00'::timestamp without time zone THEN NULL::timestamp without time zone ELSE i.previsao_entrega END) AS data_entrega,
                    string_agg(DISTINCT COALESCE(st.nome, i.status)::text, ', '::text ORDER BY (COALESCE(st.nome, i.status)::text)) AS status_agregado
                   FROM is_pedidos_itens i
                     LEFT JOIN is_extras_status st ON st.id::text = i.status::text
                  WHERE i.pedido_id = p.id) s) ai ON true;