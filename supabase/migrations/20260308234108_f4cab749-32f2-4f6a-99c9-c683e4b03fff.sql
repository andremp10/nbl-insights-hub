-- Índice funcional para acelerar RPCs financeiras que usam COALESCE(data_emissao, data_pagto)
CREATE INDEX IF NOT EXISTS idx_fin_lanc_competencia 
ON is_financeiro_lancamentos ((COALESCE(data_emissao, data_pagto)::date))
WHERE status IN (1, 2);

-- Índice composto para acelerar view vw_dashboard_pedidos (filtra por created_at + JOIN cliente_id)
CREATE INDEX IF NOT EXISTS idx_is_pedidos_created_cliente 
ON is_pedidos (created_at DESC, cliente_id);