# Orari Reparto — stato progetto

Ultimo aggiornamento: 2026-09-03

## Link app
https://giulio-o.github.io/tweet-sentiment-stream/orari-reparto-demo/

## Architettura
- Frontend statico su GitHub Pages, cartella `orari-reparto-demo/`.
- Stato multi-PDV sincronizzato con Google Sheets tramite Apps Script.
- Telegram usato per richieste, collegamenti addetti e coperture.
- Nessun token, chiave amministratore o BOT_TOKEN deve essere salvato in GitHub.

## Gerarchia regole
1. Esigenze di reparto e competenze necessarie.
2. Regole generali di pianificazione.
3. Regole specifiche del singolo PDV.
4. Regole/preferenze della singola persona.
5. Richieste personali approvate o note ancora da approvare.

## Regole generali principali
- Turno unico ordinario: fino a 7h15 di presenza con 15 min di pausa = 7h effettive.
- Oltre 7h30 di presenza la giornata deve essere gestita come spezzato.
- Spezzato: massimo 8h complessive; secondo segmento almeno 2h30 secondo l'interpretazione attuale.
- Niente doppio turno lungo mattina + lungo sera nello stesso giorno.
- Più segmenti nello stesso giorno solo se compatibili con il massimo giornaliero.
- Riposo preferito tra fine turno e inizio successivo: 12h. Chiusura→apertura è eccezione da evidenziare e minimizzare, non divieto assoluto.
- Distribuire tutte le ore ordinarie per quanto possibile; le esigenze di reparto prevalgono.
- A parità di copertura, privilegiare il recupero ore/allungamento turni lunedì, venerdì e sabato.

## PDV 1 / negozio 349
- Chiusura negozio: 20:45.
- Forno: ingresso 06:00.
- Mercoledì giorno basso: quando chiude il CR, CR + 1 addetto può essere sufficiente.
- Massimo, Maia e Gianmarco non devono essere gli unici componenti della squadra di chiusura; deve esserci almeno una persona esterna al trio. Il CR conta come persona esterna.
- Per Katia evitare il più possibile chiusura→apertura perché viene da lontano.
- Settimana reale 07–13/09/2026 usata come modello operativo; domenica reale 13/09: Stefano + Miriam 07:00–13:15.
- Maia è stata spostata ai Generi Vari nella settimana modello.

## Assenze / richieste
- Una normale `richiesta` è solo promemoria `Da approvare`: non cambia turno, non ricalcola e non crea indisponibilità fino a comando esplicito.
- 104 e permesso sindacale sono comunicazioni di diritto, non richieste da approvare: bloccano la pianificazione e avviano la ricerca copertura.
- Malattia: blocca il periodo e alimenta i contatori; i turni già presenti diventano `SCOPERTO · da coprire per malattia`.
- Gianmarco: malattia 02/09/2026–20/09/2026.
- Miriam: 8h permesso sindacale 07/09/2026.
- Marine: 8h permesso 104 08/09/2026.
- Maia: richieste mattina libera 08/09, 14/09, 16/09, 23/09 tutte `Da approvare`.

## UI
- Vista Orari con modifica turni.
- Vista Addetto.
- Ferie, Permessi, Malattia e Spostamenti.
- Griglia odierna: competenze, ore residue e turno di oggi.
- Contatori malattia.
- Pulsante `Rigenera per assenze`: ricostruisce i turni coinvolti da ferie, malattia e permessi certi, propone fino a 3 sostituti compatibili e permette di applicare la singola scelta o tutte le soluzioni consigliate.
- Griglia base settimanale: addetti sulle righe e giorni sulle colonne; segue la settimana selezionata e mostra la rotazione ciclica senza cambiare le priorità operative.
- Controllo chiusura→apertura su entrambe le giornate: rosso se il riposo è sotto le 12 ore, ambra se è tra 12 e 13 ore; sono inoltre evidenziati turni scoperti e competenze insufficienti.
- Esporta tabella settimanale.
- Bottone `Manda tabella per mail` con destinatario già configurato nell'app.
- Hover/pressione visiva sui pulsanti.

## Telegram coperture
Flusso desiderato/implementato lato frontend:
- 104/sindacale o altra assenza certa → turno da coprire.
- Proposta candidati compatibili per competenza, disponibilità, riposo e carico ore.
- CR preme `Manda richiesta`.
- Sostituto riceve Telegram e accetta/rifiuta.
- Accettazione crea la copertura.
Backend Apps Script deve essere distribuito nella versione che supporta queste azioni.

## File moduli recenti
- `orari-v9-part23.js`: permessi, spostamenti, note richieste, regole a livelli.
- `orari-v9-part24.js`: regole generali parametrizzate e riposo.
- `orari-v9-part25.js`: 104/sindacale e coperture Telegram.
- `orari-v9-part26.js`: separazione orari PDV / regole generali.
- `orari-v9-part27.js`: limiti turno unico, spezzato, doppio lungo.
- `orari-v9-part28.js`: settimana modello reale 07–13/09/2026.
- `orari-v9-part29.js`: invio tabella per email.
- `orari-v9-part30.js`: limite multi-turno giornaliero.
- `orari-v9-part31.js`: malattia, contatori, griglia odierna e distribuzione ore lun/ven/sab.
- `orari-v9-part32.js`: pianificatore coperture per assenze con confronto candidati, controllo competenze/riposo/ore e applicazione reversibile.
- `orari-v9-part33.js`: griglia base ciclica, audit fabbisogni/competenze e segnalazione dei passaggi chiusura-apertura critici o borderline.
- `orari-v9-part34.js`: alternanza intersettimanale delle chiusure del sabato; chi ha chiuso il sabato precedente viene sostituito o scambiato solo con personale competente e con riposi validi. Le eccezioni inevitabili restano evidenziate come borderline.
- `orari-v9-part35.js`: indisponibilità di Massimo nel pomeriggio del 15/09/2026, presidio dell’inventario trimestrale del 16/09 e assetto esplicito del sabato 19 con Katia 09:30-14:30, Antonio/Miriam in chiusura e Maia 13:00-17:30.

## Regola di continuità
In una nuova chat del progetto, leggere prima questo file e poi controllare gli ultimi moduli caricati dall'`index.html` prima di modificare il codice. Non affidarsi a ricostruzioni a memoria quando il repository contiene lo stato corrente.
