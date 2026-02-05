
# Plano: Redesign da Página de Login (Estilo Premium Animado)

## Objetivo
Refatorar a página de login (`/auth`) para usar o estilo visual premium do componente "travel-connect-signin-1", adaptando para o contexto NBL e removendo o login com Google.

---

## Análise do Componente de Referência

O componente fornecido possui:
1. **Layout Split-Screen**: Mapa animado à esquerda + formulário à direita
2. **Animações Canvas**: Mapa de pontos com rotas animadas usando canvas
3. **Animações Framer Motion**: Hover effects no botão de submit
4. **Design Light Premium**: Cores suaves, gradientes em azul
5. **Campo de senha com toggle**: Visibilidade da senha

### Elementos a Remover
- Login com Google (botão + SVG do ícone)
- Divisor "or"
- Campo de email (manter apenas senha)

### Elementos a Adaptar
- Branding: "Travel Connect" → "NBL Insights Hub"
- Texto de descrição: adaptar para contexto da gráfica
- Cores: adaptar para o tema dark mode existente do projeto
- Manter lógica de autenticação existente (`useAuth` hook)

---

## Arquitetura da Solução

```text
src/pages/Auth.tsx (refatorado)
├── DotMapCanvas (novo componente interno)
│   └── Canvas animado com mapa de pontos e rotas
├── SignInForm
│   ├── Logo NBL animado
│   ├── Título e descrição
│   ├── Campo de senha (único)
│   ├── Toggle de visibilidade
│   └── Botão com hover animation
└── Layout split-screen responsivo
```

---

## Detalhes Técnicos

### 1. Componente DotMapCanvas
- Canvas HTML5 com animação de pontos formando silhueta de mundo
- Rotas animadas conectando pontos (representando conexões globais)
- Cores adaptadas para dark mode: tons de azul sobre fundo escuro
- Overlay com logo NBL e texto de boas-vindas

### 2. Formulário Redesenhado
- Apenas campo de senha (sistema atual usa senha fixa)
- Input com estilo premium (glassmorphism)
- Botão com gradiente azul e animação de hover (ArrowRight desliza para dentro)
- Framer Motion para animações suaves

### 3. Responsividade
- Desktop: Split-screen (mapa 50% + form 50%)
- Tablet: Split-screen ajustado
- Mobile: Mapa como header menor + form abaixo

### 4. Cores para Dark Mode
```css
/* Pontos do mapa */
rgba(59, 130, 246, 0.4) /* azul semi-transparente */

/* Rotas */
#3b82f6 /* azul primário */

/* Gradiente do botão */
from-blue-500 to-indigo-600
```

---

## Entregáveis

### Arquivo Único: `src/pages/Auth.tsx`
1. **DotMapCanvas**: Componente interno para animação do mapa
2. **Auth (default export)**: Página completa redesenhada

### Dependências
- `framer-motion` (já instalado)
- `lucide-react` (já instalado)

### Não serão alterados
- `AuthContext.tsx` - mantém lógica de autenticação intacta
- `index.css` - cores CSS já suportam o design
- Rotas do aplicativo

---

## Layout Final Esperado

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  ┌──────────────────────────┬──────────────────────────────────┐│
│  │                          │                                  ││
│  │   🌍 Mapa Animado        │   NBL Insights Hub               ││
│  │   (Canvas com pontos     │                                  ││
│  │    e rotas brilhantes)   │   Acesse o painel de gestão      ││
│  │                          │                                  ││
│  │   ┌─────────────────┐    │   ┌────────────────────────────┐ ││
│  │   │  NBL Insights   │    │   │ 🔒 Senha                   │ ││
│  │   │     Hub         │    │   └────────────────────────────┘ ││
│  │   └─────────────────┘    │                                  ││
│  │                          │   ┌────────────────────────────┐ ││
│  │   Conectando dados       │   │      Entrar →              │ ││
│  │   para decisões          │   └────────────────────────────┘ ││
│  │   inteligentes           │                                  ││
│  │                          │                                  ││
│  └──────────────────────────┴──────────────────────────────────┘│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comportamento

1. Usuário acessa `/auth`
2. Vê animação do mapa com rotas pulsando
3. Digita a senha no campo
4. Clica no botão (animação de hover com seta)
5. Se correto: toast de sucesso + redireciona para `/financeiro`
6. Se incorreto: toast de erro + limpa campo

---

## Critérios de Sucesso

- [ ] Mapa animado renderiza corretamente no canvas
- [ ] Rotas animam em loop suave
- [ ] Campo de senha funciona com toggle de visibilidade
- [ ] Botão tem animação de hover premium
- [ ] Layout responsivo (desktop/tablet/mobile)
- [ ] Autenticação funciona igual ao sistema atual
- [ ] Cores adaptadas ao tema dark mode do projeto
