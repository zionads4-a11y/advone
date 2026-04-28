import os
import subprocess

# Lista de arquivos importantes (excluindo UI components básicos e node_modules)
files_to_include = [
    "supabase/functions/test-bot-chat/index.ts",
    "supabase/functions/zapi-webhook/index.ts",
    "src/components/companies/BotTestChat.tsx",
    "src/App.tsx",
]

# Adicionar mais alguns arquivos relevantes de lógica
all_files = []
for root, dirs, files in os.walk('supabase/functions'):
    if 'node_modules' in dirs: dirs.remove('node_modules')
    for file in files:
        if file.endswith('.ts'):
            all_files.append(os.path.join(root, file))

# Filtrar apenas os index.ts das funções mais relevantes se forem muitos
important_functions = ['test-bot-chat', 'zapi-webhook', 'decision-engine', 'legal-ai-chat']
logic_files = [f for f in all_files if any(func in f for func in important_functions)]

final_list = list(set(files_to_include + logic_files))

# Criar um arquivo markdown consolidado
with open("codigo_projeto.md", "w") as f:
    f.write("# Códigos do Projeto\n\n")
    for file_path in sorted(final_list):
        if os.path.exists(file_path):
            f.write(f"## Arquivo: {file_path}\n\n")
            f.write("```typescript\n")
            with open(file_path, "r") as code_file:
                f.write(code_file.read())
            f.write("\n```\n\n---\n\n")

# Converter markdown para PDF usando o CLI do md-to-pdf se disponível, ou apenas salvar o .md se não
# Como não tenho md-to-pdf nativo, vou tentar usar o pandoc ou apenas avisar
