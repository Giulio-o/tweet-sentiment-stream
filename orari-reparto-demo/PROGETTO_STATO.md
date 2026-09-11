# Orari Reparto — stato progetto

Ultimo aggiornamento: 2026-09-11

## Link app
https://giulio-o.github.io/tweet-sentiment-stream/orari-reparto-demo/

## Architettura
- Frontend statico su GitHub Pages, cartella `orari-reparto-demo/`.
- Stato multi-PDV sincronizzato con Google Sheets tramite Apps Script.
- Telegram usato per richieste, collegamenti addetti e coperture.
- Nessun token, chiave amministratore o BOT_TOKEN deve essere salvato in GitHub.

## Gerarchia operativa
1. Esigenze del negozio e copertura reale dei reparti.
2. Competenze autonome richieste dalla mansione.
3. Eventi, assenze, rientri e richieste approvate.
4. Riposo preferito, bilanciamento aperture/chiusure e alternanza del sabato.
5. Monte ore, rotazione ed equità degli straordinari, usati solo tra alternative operative equivalenti.

Questa gerarchia e una guida, non un insieme di regole ferree: quando due indicazioni sono in conflitto prevale il presidio del negozio. Le eccezioni restano visibili e devono essere controllate dal CR.

## Regole generali principali
- Turno unico ordinario: fino a 7h15 di presenza con 15 min di pausa = 7h effettive.
- Oltre 7h30 di presenza la giornata deve essere gestita come spezzato.
- Spezzato: massimo 8h complessive; secondo segmento almeno 2h30 secondo l'interpretazione attuale.
- Niente doppio turno lungo mattina + lungo sera nello stesso giorno.
- Più segmenti nello stesso giorno solo se compatibili con il massimo giornaliero.
- Riposo preferito tra fine turno e inizio successivo: 12h. Chiusura→apertura è eccezione da evidenziare e minimizzare, non divieto assoluto.
- Distribuire tutte le ore ordinarie per quanto possibile; le esigenze di reparto prevalgono.
- A parità di copertura, privilegiare il recupero ore/allungamento turni lunedì, venerdì e sabato.
- Dopo aver garantito copertura e competenze, evitare chiusure→aperture critiche tramite sostituzione o scambio equivalente; se non risolvibili, mantenerle evidenziate.

## PDV 1 / negozio 349
- Chiusura negozio: 20:45.
- Forno: ingresso 06:00.
- Mercoledì giorno basso: quando chiude il CR, CR + 1 addetto può essere sufficiente.
- Massimo, Maia e Gianmarco, quando sono in chiusura Gastronomia, richiedono un addetto esperto non-CR. Se il loro turno di chiusura inizia alle 13:30, il supporto deve entrare entro le 14:00; il CR da solo non soddisfa questa esigenza.
- Due chiusure settimanali per addetto sono il limite ordinario. La terza e ammessa solo come eccezione per esigenze di reparto e viene penalizzata considerando anche quante chiusure sono state fatte nella settimana precedente.
- Tra alternative con la stessa copertura e competenza, gli straordinari vengono distribuiti sui part-time cercando una differenza massima di 4 ore tra il valore piu alto e quello piu basso. Se non e possibile, prevale il fabbisogno del reparto e lo scostamento resta visibile.
- Per Katia evitare il più possibile chiusura→apertura perché viene da lontano.
- Orario pubblicato 07–13/09/2026 aggiornato dal PDF Drive del 04/09; domenica reale 13/09: Stefano + Miriam 07:00–13:15.
- Orario definitivo 14–20/09/2026 aggiornato dall'ultimo PDF Drive del 05/09 alle 14:26, comprese vendite e compensazioni; Marine assente, Gianmarco rientra il 17, Katia e Maia lavorano domenica 20.
- Venerdì 18 l'orario pubblicato lascia un solo addetto fino alle 20:45 (Gianmarco termina alle 20:00): l'app mantiene il dato ma lo evidenzia come chiusura borderline da verificare.
- Maia è stata spostata ai Generi Vari nella settimana modello.
- Forno: presenza autonoma dalle 06:00; una persona in formazione non sostituisce la copertura competente.
- Ogni venerdì: vendita Pesce 07:00–13:30 oppure 07:00–14:00, affidata esclusivamente a Marine o Katia con competenza autonoma e conteggiata nelle ore Carni. La distribuzione ore non può estenderla alle 14:15/14:30. Se manca una soluzione compatibile resta SCOPERTO.
- Sabato: rinforzo vendita straordinaria al mattino 09:30–13:30 oppure 09:00–14:00, come quinta presenza (compreso il CR se effettivamente presente); sostituisce il rinforzo generato 13:00–17:30, senza toccare le coperture di chiusura. La formazione non è copertura autonoma.
- Chiusura: normalmente due persone; per inventario o altri eventi serve la terza. Il CR conta soltanto se copre davvero la fascia dell'evento.
- Domenica osservata: due persone 07:00–13:15, con almeno una persona autonoma.

## Promozioni 01–14/10/2026
- Fonte: `promo dal 1 al 14 ottobre.xlsx`, caricato su Drive il 05/09/2026.
- 25 referenze mostrate come promemoria, raggruppate per Carni (11), Gastronomia (6), Pescheria (6) e Forneria (2).
- Il promemoria appare soltanto nelle settimane che si sovrappongono al periodo 01–14/10.
- Le promozioni non aggiungono ore e non modificano turni, fabbisogni, competenze o priorità del generatore.

## Assenze / richieste
- Pulsante `Libero / corso`: una data, addetto, causale Libero o Corso fuori sede, ore riconosciute modificabili anche a zero e nota facoltativa. Salva in `S.absences` con `dayStatus`, `fullDay:true`; usa la sincronizzazione esistente.
- Le ore della giornata sono credito personale (colonna Corso/libero), non ore lavorate o copertura dei reparti. Riducono il target personale da assegnare in negozio. Un libero a zero ore blocca la data senza ridurre il target settimanale.
- Sono disponibili modifica ed eliminazione. La stessa data/addetto viene aggiornata senza duplicare le ore. Ferie, malattia, spostamenti, altri permessi o crediti festivi già presenti bloccano un secondo inserimento sovrapposto.
- Anche i turni manuali o pubblicati assegnati all'addetto nella data scelta diventano scoperture visibili; i dati originali non vengono cancellati. Il pianificatore assenze include queste giornate e non propone un addetto impegnato in corso o libero.
- Una normale `richiesta` è solo promemoria `Da approvare`: non cambia turno, non ricalcola e non crea indisponibilità fino a comando esplicito.
- 104 e permesso sindacale sono comunicazioni di diritto, non richieste da approvare: bloccano la pianificazione e avviano la ricerca copertura.
- Malattia: blocca il periodo e alimenta i contatori; i turni già presenti diventano `SCOPERTO · da coprire per malattia`.
- Gianmarco: malattia 02/09/2026–16/09/2026; rientro previsto il 17/09.
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
- `orari-v9-part40.js`: libero/corso per una giornata, ore riconosciute, inserimento/modifica/eliminazione, blocco pianificazione e vista ore/griglia/addetto/esportazione.
- `orari-v9-part23.js`: permessi, spostamenti, note richieste, regole a livelli.
- `orari-v9-part24.js`: regole generali parametrizzate e riposo.
- `orari-v9-part25.js`: 104/sindacale e coperture Telegram.
- `orari-v9-part26.js`: separazione orari PDV / regole generali.
- `orari-v9-part27.js`: limiti turno unico, spezzato, doppio lungo.
- `orari-v9-part28.js`: orario pubblicato 07–13/09/2026 aggiornato dal PDF Drive del 04/09.
- `orari-v9-part29.js`: invio tabella per email.
- `orari-v9-part30.js`: limite multi-turno giornaliero.
- `orari-v9-part31.js`: malattia, contatori, griglia odierna e distribuzione ore lun/ven/sab.
- `orari-v9-part32.js`: pianificatore coperture per assenze con confronto candidati, controllo competenze/riposo/ore e applicazione reversibile.
- `orari-v9-part33.js`: griglia base ciclica, audit fabbisogni/competenze e segnalazione dei passaggi chiusura-apertura critici o borderline.
- `orari-v9-part34.js`: alternanza intersettimanale delle chiusure del sabato; chi ha chiuso il sabato precedente viene sostituito o scambiato solo con personale competente e con riposi validi. Le eccezioni inevitabili restano evidenziate come borderline.
- `orari-v9-part35.js`: prima bozza operativa 15-19/09 (Massimo, inventario e riassetto Katia); per la settimana pubblicata viene superata dai dati Drive del modulo successivo.
- `orari-v9-part36.js`: settimana definitiva 14-20/09/2026 importata dall'ultimo PDF Drive del 05/09; include vendite, compensazioni e domenica, mantiene le 27 ore di formazione di Maia fuori dal monte ore operativo, Marine assente e Gianmarco dal 17/09.
- `orari-v9-part37.js`: linee guida esigenze-prima ricavate dal confronto dei due orari pubblicati; aggiorna la gerarchia mostrata nella griglia e nella pagina regole.
- `orari-v9-part38.js`: promemoria delle promozioni attive 01-14/10/2026, senza alcun effetto su ore o generazione dei turni.
- `orari-v9-part39.js`: supporto esperto non-CR alle chiusure di Massimo/Maia/Gianmarco in Gastronomia, supporto entro le 14:00 quando il turno parte alle 13:30, limite mobile di due chiusure e distribuzione degli straordinari part-time con obiettivo di scostamento massimo 4 ore.
- `orari-v9-part41.js`: proposta eccezionale 21–27/09 da Calendar e istruzioni CR 11/09. Orari CR confermati, riunioni lunedì 14:30–17:30 e martedì 15–17 nelle ore personali ma fuori copertura; CR Macelleria giovedì 15–17, venerdì 11–13 / 15–20:45, sabato 6–13:30. Venerdì Gianmarco 7–11 Carni / 13:30–17:30 Gastro, poi Massimo; sabato Gianmarco 13:30–20:45 Carni. Nessun doppio conteggio giovedì. Assenze in `S.absences`, seed versionato/idempotente e sincronizzato: Miriam libera 21, Stefano corso 22 con 4h, Katia 12h provvisoriamente 6+6 il 23/24, Marine assente 21–25, Gabriele in ferie 21–27, migrate in S.leaves (versione correzione v2). Credito Marine non indicato: 0 provvisorio da confermare. Gianmarco escluso dal confronto extra PT della sola settimana 21–27 perché copre il full-time assente in Macelleria; le sue ore personali restano intatte. Maia libera mattina 23, formazione 24/25/26 pari a 20:45 fuori monte ore reparto; domenica Marine/Miriam 7–13:15. La proposta rispetta competenze e supporti, mantiene edit manuali/coperture e non replica le eccezioni nelle settimane successive; il carico chiusure alimenta il confronto della settimana seguente. Da risolvere: quinta presenza autonoma Gastro sabato scoperta (CR sentirà altro negozio), differenza extra degli altri PT 6:00, riposi CR 9:15 e Marine 10:15 critici, Gianmarco seconda chiusura sabato consecutiva. Non presentare questa proposta come orario senza criticità.

## Regola di continuità
In una nuova chat del progetto, leggere prima questo file e poi controllare gli ultimi moduli caricati dall'`index.html` prima di modificare il codice. Non affidarsi a ricostruzioni a memoria quando il repository contiene lo stato corrente.
