# Chat Recovery — prosnab.tech mail setup (2025-10-12)

This folder reconstructs the last chat context so you can continue seamlessly.

## Key emails
- Alex@prosnab.tech
- adp@prosnab.tech
- zapros@prosnab.tech

## Infra context
- Mail UI: https://mail.prosnab.tech
- IMAP: mail.prosnab.tech:993 (SSL)
- SMTP: mail.prosnab.tech:587 (STARTTLS)
- DNS (examples): MX -> mail.prosnab.tech; SPF: "v=spf1 mx ~all"; DMARC rua=postmaster@prosnab.tech; DKIM to generate in mailcow

## Sources recovered
- VS Code History entries with the above emails:
  - /root/.vscode-server/data/User/History/3aab3ce5/entries.json (I5Ye.json, wuou.json, 4PLx.json)
  - /root/.vscode-server/data/User/History/-1301b7e9/entries.json (boGR.json, JU9K.json, hxoH.json)
  - /root/.vscode-server/data/User/History/-70255706/entries.json (uzmo.json, VxCi.json, upPW.json, ZZOC.json)
- Infra docs:
  - /opt/deep-agg/docs/_artifacts/2025-10-12-infrastructure/README.md
  - /opt/deep-agg/docs/_artifacts/2025-10-12-infrastructure/INFRASTRUCTURE-PLAN.md

## Continue here — seed prompt
Copy-paste the following into Copilot Chat to continue where we left off:

```
Мы восстанавливаем последний контекст по prosnab.tech. Продолжаем настройку mailcow и почты. В проекте есть:
- Ящики: нужно завести Alex@prosnab.tech, adp@prosnab.tech, zapros@prosnab.tech.
- mailcow: MAILCOW_HOSTNAME=mail.prosnab.tech; UI доступен через https://mail.prosnab.tech.
- IMAP: 993 SSL, SMTP: 587 STARTTLS.
- DNS: MX -> mail.prosnab.tech; SPF "v=spf1 mx ~all"; DMARC (rua=postmaster@prosnab.tech); DKIM нужно сгенерировать.
Задачи: (1) создать ящики и при необходимости алиасы, (2) сгенерировать DKIM и выдать TXT, (3) проверить MX/SPF/DMARC/Autodiscover/Autoconfig, (4) выполнить смоук‑тесты IMAP/SMTP. Отвечай коротко и давай пошаговые действия. Если потребуется — предложи команды.
```

## Notes
- Полного авто‑апрува в Copilot Chat нет (ограничение безопасности). Чтобы обойти подтверждения — можно выполнять команды напрямую в терминале или использовать auto‑ops runner.
