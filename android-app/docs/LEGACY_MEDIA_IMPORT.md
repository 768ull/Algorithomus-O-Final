# Importar as mídias dos repositórios antigos

O importador precisa ler três repositórios privados do mesmo proprietário:

- `768ull/Algorithomus`: APK híbrido e arquivo ZIP da versão assinada.
- `768ull/https-algorithomus.com.br-`: APKs Cobrinha/Frutris e seus arquivos-fonte.
- `768ull/Algorithomus-App`: árvore web da versão v1.9.

O token padrão `GITHUB_TOKEN` do Actions não recebe acesso automático aos outros repositórios privados. Por isso, crie um fine-grained personal access token com permissão **Contents: Read-only** para esses três repositórios e cadastre-o no repositório `Algorithomus-O-Final` em:

**Settings → Secrets and variables → Actions → New repository secret**

Nome exato do secret: `LEGACY_REPOS_TOKEN`

Não coloque o token em arquivos, commits, mensagens ou no APK. O workflow o utiliza apenas durante a importação e não grava o valor no relatório.

Depois de cadastrar o secret, execute manualmente **Actions → Build Algorithomus Android APK → Run workflow**. O importador:

1. Baixa os APKs/ZIPs históricos sem executá-los.
2. Extrai somente mídias e recursos visuais/sonoros; não copia certificados ou keystores.
3. Importa os arquivos da árvore web antiga.
4. Preserva bytes originais, nomes e hashes; conflitos são arquivados em vez de sobrescritos.
5. Extrai novamente as imagens incorporadas no PDF.
6. Audita duplicatas exatas e semelhanças visuais sem apagar imagens diferentes.
7. Verifica se todos os arquivos inventariados foram incluídos no APK final.

## Estado confirmado antes da importação privada

O snapshot atual do site tem 69 imagens e 20 áudios, mas nenhum vídeo. O PDF enviado tem 39 imagens extraídas. O inventário identifica 126 arquivos de mídia no total, incluindo referências arquivadas e cópias repetidas.

Os 196 endereços antigos que retornaram HTTP 404 no rastreamento são registrados como ausentes, não substituídos por arquivos inventados. A importação dos APKs privados é necessária para procurar mídia adicional e preencher essas lacunas.
