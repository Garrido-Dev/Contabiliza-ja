# 📊 Contabiliza Já

> Sistema de gestão financeira, controle de consultorias e carteira de clientes desenvolvido para consultores contábeis e prestadores de serviços autônomos.

O **Contabiliza Já** resolve a desorganização de controlar orçamentos, entregas de serviços e recebimentos em planilhas soltas. A plataforma centraliza o ciclo de atendimento do consultor em uma interface otimizada para produtividade, com acompanhamento em tempo real de faturamento e métricas de pendências.

---

## 🔗 Demonstração & Acesso

🔗 **Acesse a aplicação em produção:** [GitHub](https://garrido-dev.github.io/Contabiliza-ja/)

### Capturas de Tela

| 📋 Gestão de Consultorias | 📈 Dashboard Financeiro |
| :---: | :---: |
| ![Tela de Consultorias](https://via.placeholder.com/600x350/0f172a/ffffff?text=PRINT_CONSULTORIAS) | ![Dashboard Financeiro](https://via.placeholder.com/600x350/0f172a/ffffff?text=PRINT_FINANCEIRO) |

| 👥 Carteira de Clientes | 💳 Paywall / Limite Freemium |
| :---: | :---: |
| ![Gestão de Clientes](https://via.placeholder.com/600x350/0f172a/ffffff?text=PRINT_CLIENTES) | ![Aviso de Limite de Clientes](https://via.placeholder.com/600x350/0f172a/ffffff?text=PRINT_PAYWALL) |

---

## 🛠️ Tecnologias Utilizadas

* **Front-end:** React.js, Vite, Tailwind CSS / Styled Components
* **Ícones & UI:** Lucide Icons, React Icons
* **Gráficos:** Recharts
* **Back-end & Autenticação:** Firebase Authentication & Cloud Firestore
* **Hospedagem:** Vercel

---

## 📁 Estrutura de Diretórios do Projeto

```text
contabiliza-ja/
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── assets/              # Logos estáticos, ícones e artes
│   ├── components/          # Componentes reutilizáveis
│   │   ├── Header.jsx       # Barra superior
│   │   ├── Sidebar.jsx      # Navegação lateral
│   │   ├── KpiCard.jsx      # Indicadores do financeiro
│   │   └── Modal.jsx        # Modais de cadastro e avisos
│   ├── config/
│   │   └── firebase.js      # Conexão com Firebase Auth e Firestore
│   ├── context/
│   │   └── AuthContext.jsx  # Contexto global de autenticação
│   ├── hooks/               # Custom Hooks
│   │   ├── useClientes.js   # Estado e ações de clientes
│   │   └── useFinanceiro.js # Filtros de faturamento e cálculos
│   ├── pages/               # Páginas principais
│   │   ├── Consultorias.jsx # Listagem e atualização de status de serviços
│   │   ├── Financeiro.jsx   # Dashboard com gráficos e KPIs
│   │   ├── Clientes.jsx     # Carteira de clientes
│   │   └── Login.jsx        # Autenticação de usuário
│   ├── services/            # Comunicação direta com a API do Firestore
│   │   ├── clientesService.js
│   │   └── consultoriasService.js
│   ├── styles/              # Configurações de tema e CSS global
│   ├── App.jsx              # Rotas e layout base
│   └── main.jsx             # Ponto de entrada do React
├── .env.example             # Exemplo de variáveis de ambiente
├── firebase.json            # Configuração do Firebase CLI
├── package.json
└── vite.config.js
```

---

## 🗄️ Arquitetura de Dados & Requisições ao Firebase

Para isolar os dados de cada consultor e permitir buscas rápidas no painel do Firestore, a estrutura utiliza **subcoleções associadas ao `uid` do usuário autenticado**.

### Modelagem de Dados no Cloud Firestore

```text
/users (coleção)
  └── {user_uid} (documento do consultor)
        ├── plano: "free" | "pro"
        ├── totalClientes: 3
        │
        ├── /clientes (subcoleção)
        │     └── {cliente_id} (doc)
        │           ├── nome: "Geronimo"
        │           ├── document: "12365412358"
        │           ├── phone: "21654669878"
        │           ├── email: "leo@hotmail.com"
        │           └── createdAt: timestamp
        │
        └── /consultorias (subcoleção)
              └── {consultoria_id} (doc)
                    ├── clienteId: {cliente_id}
                    ├── clienteNome: "Geronimo"
                    ├── servico: "Folha de Pagamento"
                    ├── valor: 800.00
                    ├── status: "Pendente" | "Em Andamento" | "Concluido"
                    └── createdAt: timestamp
```

### Funcionamento das Requisições

1. **Autenticação:** O usuário faz login e o `AuthContext` mantém o estado global do `currentUser.uid`.
2. **Consultas em Tempo Real (`onSnapshot`):** Em vez de utilizar chamadas HTTP manuais, a aplicação sincroniza o estado via listeners do Firestore.

```javascript
// Exemplo: Inscrição para ouvir alterações em consultorias em tempo real
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

export const escutarConsultorias = (userId, setConsultorias) => {
  const consultoriasRef = collection(db, 'users', userId, 'consultorias');
  const q = query(consultoriasRef, orderBy('createdAt', 'desc'));

  return onSnapshot(q, (snapshot) => {
    const lista = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));
    setConsultorias(lista);
  });
};
```

3. **Operações de Escrita:**
   * **Adicionar Cliente:** `addDoc(collection(db, 'users', userId, 'clientes'), payload)`
   * **Atualizar Status da Consultoria:** `updateDoc(doc(db, 'users', userId, 'consultorias', id), { status: novoStatus })`

---

## 💳 Regra de Monetização (Modelo Freemium)

* **Plano Gratuito:** Limite de até **3 clientes** cadastrados na carteira.
* **Validação de Limite:** Ao clicar em `+ Novo Cliente`, o sistema verifica a contagem da subcoleção `/clientes`. Se for maior ou igual a 3, o formulário é bloqueado e o modal de Upgrade para o **Plano Pro** é acionado.

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
* Node.js v18 ou superior
* Gerenciador de pacotes (`npm` ou `yarn`)

### Passo a passo

1. **Clone este repositório:**
   ```bash
   git clone https://github.com/seu-usuario/contabiliza-ja.git
   cd contabiliza-ja
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Crie o arquivo de variáveis de ambiente:**
   Crie um arquivo `.env.local` na raiz com suas credenciais do Firebase:
   ```env
   VITE_FIREBASE_API_KEY=sua_api_key
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-projeto-id
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
   VITE_FIREBASE_APP_ID=seu_app_id
   ```

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

5. Abra `http://localhost:5173` no navegador.

---

## 📌 Próximos Passos (Roadmap)

* [ ] Módulo GED para upload e envio de documentos/guias fiscais.
* [ ] Emissão de link de cobrança Pix/Boleto com integração Asaas / Mercado Pago.
* [ ] Gerador de Propostas Comerciais e Orçamentos em PDF.

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

Desenvolvido por **Juan Petro** 🚀
