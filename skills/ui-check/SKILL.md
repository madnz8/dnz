---
name: ui-check
description: "Verifica visivamente l'interfaccia di una feature: lancia l'app vera, la naviga come un utente, cattura le prove e le pubblica sulla PR. Non è una code review."
---

# dnz:ui-check

Verifica **visivamente** l'interfaccia di una feature che tocca la UI: lancia l'app vera, la naviga
come farebbe un utente, cattura screenshot (ed eventualmente una breve registrazione), e pubblica il
risultato dove chi fa la review lo vede — **sulla PR, non solo in chat**.

**Cosa non fa:** non è una code review. Non guarda il diff, non legge i test, non giudica la qualità
del codice — quello è `/code-review`. Qui l'unica domanda è **"cosa vede davvero un utente"**.

## 0 — Orientati: ambiente e repo

**Rileva, non presumere**, su due piani diversi.

**L'ambiente**, perché questa skill gira sia da terminale locale (VPS/container) sia da Claude web:

1. Prova subito a usare gli strumenti browser (`chrome-devtools` MCP, o equivalenti). Se funzionano
   al primo colpo, **salta l'intero passo 1** — molti ambienti hanno già un browser pronto.
2. Se il primo tentativo fallisce con *"Could not find Google Chrome executable"* o *"Missing X
   server"*, sei in un container/VPS senza browser preinstallato: vai al passo 1.

**Il repo**, prima di lanciare qualunque cosa:

- **Esiste già una skill di progetto che copre l'avvio dell'app?** (una skill `run`, o qualcosa
  sotto `.claude/skills/`). Se c'è, **seguila** invece di reinventare i comandi.
- **Il comando di avvio** — `CLAUDE.md`, `package.json`, `Makefile`. Non presumere `npm run dev`.
- **Su quale porta**, e soprattutto **quali variabili d'ambiente dipendono dalla porta**: è la
  trappola del passo 2.
- **Come ci si autentica** in sviluppo: c'è un dev-login? Lo dice il `CLAUDE.md`?
- **La regola sui dati** del repo: da dove NON si prendono i dati di prova, e quali viste espongono
  dati di persone vere. Serve al passo 3.

## 1 — Setup del browser (solo se il passo 0 lo richiede)

Sintomo: nessun Chrome/Chromium installato, e il container ha una sandbox del kernel che impedisce a
Chromium di avviare la propria sandbox interna (`No usable sandbox!`, con richiamo ad
apparmor-userns-restrictions).

**È un costo una volta sola per macchina, non per singolo check.** Verifica prima se è già stato
risolto qui in passato:

```bash
/opt/google/chrome/chrome --headless=new --disable-gpu --dump-dom http://example.com
```

Se restituisce HTML, il browser è pronto: salta il resto del passo 1.

Se manca, il fix — fatto una volta su rings il 2026-08-26, e da allora riusabile:

1. `npx playwright install chromium` — scarica un Chromium in `~/.cache/ms-playwright/`, percorso
   stabile che sopravvive tra le sessioni.
2. Scrivi un wrapper eseguibile **in un percorso stabile della macchina** (mai nello scratchpad di
   sessione, che viene ripulito) — es. `~/.local/bin/chrome-headless-wrapper.sh`:
   ```sh
   #!/bin/sh
   exec <percorso-chromium>/chrome --no-sandbox --disable-setuid-sandbox --headless=new "$@"
   ```
3. Punta lì il percorso che gli strumenti browser si aspettano:
   ```bash
   sudo ln -sf ~/.local/bin/chrome-headless-wrapper.sh /opt/google/chrome/chrome
   ```

⚠️ **`chmod +x` sul wrapper e il `sudo ln` qui sopra vengono bloccati dal classificatore di
sicurezza quando li esegue l'agente.** Non insistere con varianti del comando per aggirarlo: chiedi
all'utente di incollarli lui con il prefisso `!`, spiegando cosa fanno.

## 2 — Avvia l'app

Lancia il comando rilevato al passo 0.

**Forza sempre una porta fissa**, indipendentemente dal fatto che quella di default risulti libera o
occupata al momento. Non è per evitare un conflitto: è perché partire sempre dalla stessa porta nota
rende ripetibile il resto della procedura e fa emergere **subito** i problemi legati all'origine,
invece che a intermittenza.

⚠️ **La porta fissa rompe il login se non la si propaga.** È la trappola più comune: le variabili che
dichiarano l'URL dell'app (`AUTH_URL`, `NEXTAUTH_URL`, `APP_URL`, `BASE_URL`…) sono spesso hardcoded
sulla porta di default. Se il server parte altrove, il framework di autenticazione reindirizza al
posto sbagliato dopo il login e l'utente resta bloccato sulla pagina di accesso, **in loop
silenzioso**. Avvia sovrascrivendo la variabile perché combaci con la porta scelta:

```bash
AUTH_URL=http://localhost:<porta> AUTH_TRUST_HOST=true <comando-di-avvio>
```

Usa **lo stesso host** (`localhost` oppure `127.0.0.1`, mai mischiarli) sia nell'URL del browser sia
nella variabile: sono due domini diversi agli occhi del cookie di sessione, e mischiarli produce lo
stesso loop di redirect.

Aspetta il banner "Ready" nel log prima di procedere, **non un tempo fisso a caso**.

## 3 — Raggiungi lo stato applicativo che ti serve

- **Login**: se il progetto ha un dev-login, usalo. Altrimenti chiedi all'utente la via più leggera
  per autenticarti.
- **Dati mancanti**: se la feature richiede dati che non esistono ancora (un elenco vuoto, un
  vocabolario mai popolato), creali **al volo dall'interfaccia stessa**, con valori inventati — mai
  dati reali, mai copiati da un dump del db o da una cartella di dati locali.
- ⚠️ **Prima di screenshottare qualunque vista che espone dati di persone**, verifica cosa c'è
  davvero nel db di sviluppo in quel momento: capita che contenga dati veri. Se è così, **non
  procedere** finché non è ripopolato con dati inventati. Uno screenshot finisce su una PR, e una PR
  non si ripulisce.

## 4 — Cattura le prove

Naviga **ogni schermata e ogni stato** che la feature tocca — non solo l'happy path: stato vuoto,
dialog di creazione e modifica, stato con overflow o caso limite visibile, viewport mobile se il
diff tocca la navigazione o componenti responsive.

Per ogni stato, uno screenshot con **nome descrittivo** — non `screenshot1.png`.

Se vedere l'**interazione** aggiunge qualcosa che gli stati statici non dicono, produci anche una
breve registrazione: uno script Playwright throwaway con `recordVideo`, riusando lo stesso binario
Chrome del passo 1 — non serve nessun setup aggiuntivo.

Salva tutto nello **scratchpad di sessione, mai nel repo**.

## 5 — Pubblica il risultato sulla PR, non solo in chat

**Obiettivo: chi fa la review vede le prove aprendo la PR, non scorrendo la chat.**

- **Default** — costruisci un'unica pagina Artifact autosufficiente con tutti gli screenshot (e il
  video) incorporati e didascalie brevi; pubblicala (privata di default, link condivisibile); posta
  un commento sulla PR con **solo il link**. Un link è testo semplice: si apre sempre,
  indipendentemente dalla visibilità del repo.
- Se l'utente ha **Claude in Chrome** collegato al proprio browser già loggato su GitHub, proponi in
  alternativa di pilotarlo e allegare i file per davvero (drag&drop nel box del commento) —
  risultato nativo, identico a farlo a mano.
- ⚠️ **Mai tentare di allegare file binari a un commento PR via `gh` o API**: non esiste un endpoint
  pubblico per farlo. Solo il browser lo supporta.
- ⚠️ **Mai pushare screenshot o video dentro un branch vero** per ottenere un link raw: restano
  nella history per sempre. Se serve davvero un link ospitato su git, usa un branch orfano dedicato
  e mai mergiato, e **chiedi conferma esplicita prima di pushare** — è comunque un cambiamento
  visibile sul remoto condiviso. Nota anche che su un repo **privato** i link
  `raw.githubusercontent.com` non si aprono in modo affidabile per chi legge: motivo in più per
  preferire la pagina Artifact.

## 6 — Pulizia

- **Ferma ogni server o processo** avviato per il check.
- **Non lasciare dati di test** che possano confondere una sessione futura — a meno che siano
  palesemente innocui, e in quel caso **dillo** invece di lasciarlo scoprire a qualcun altro.
