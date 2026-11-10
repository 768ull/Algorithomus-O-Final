# Assinatura de versões de distribuição

A identidade de assinatura precisa permanecer a mesma em todas as atualizações do APK. Não enviar keystore, senhas, arquivos PEM ou chaves privadas ao GitHub.

O script `scripts/sign-release.sh` assina um APK de release com V1, V2, V3 e V4 e verifica a assinatura com `apksigner`. A assinatura V4 produz um arquivo auxiliar `.idsig`; ela não substitui as assinaturas principais do APK.

Antes de publicar:
1. Criar ou selecionar uma keystore definitiva que ficará sob controle do proprietário.
2. Guardar pelo menos duas cópias seguras da keystore e das senhas, fora do repositório.
3. Configurar os segredos do GitHub Actions `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` e `ANDROID_KEY_PASSWORD`.
4. Nunca trocar a keystore entre versões que precisam atualizar a instalação já existente.
5. Verificar o APK final com `apksigner verify` e testar a atualização sobre a versão anterior.

A keystore ainda não foi criada nem enviada nesta etapa.
