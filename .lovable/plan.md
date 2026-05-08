Para conectar ao ElevenLabs, implementarei uma integração que permita transformar as respostas da IA Jurídica (Dra. Helena) em áudio.

### Detalhes técnicos
- **Secrets**: O usuário precisará adicionar a `ELEVENLABS_API_KEY` via ferramenta de secrets.
- **Edge Function**: Criarei uma nova função `text-to-speech` para realizar a comunicação segura com a API da ElevenLabs, evitando expor a chave no frontend.
- **Frontend**: Adicionarei um botão de "Ouvir" nas mensagens da assistente na página `LegalAI.tsx`.
- **Áudio**: Utilizarei a API nativa de áudio do navegador para reproduzir o fluxo retornado pela ElevenLabs.

### Passos da implementação
1.  **Configuração de Secret**: Solicitar/orientar o usuário a configurar a `ELEVENLABS_API_KEY`.
2.  **Criação da Edge Function**:
    - Nome: `text-to-speech`
    - Funcionalidade: Recebe texto, envia para ElevenLabs, retorna stream de áudio.
3.  **Atualização da Interface (LegalAI.tsx)**:
    - Adicionar ícone de volume/play nas mensagens da Dra. Helena.
    - Implementar lógica de carregamento e reprodução de áudio.
4.  **Verificação**: Testar a chamada à Edge Function.