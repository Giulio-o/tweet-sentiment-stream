# Demo Ordini Freschi

Demo web statica per preparare ordini di gastronomia, forneria, rosticceria, carni e pesce prima della ridigitazione nel gestionale aziendale.

## Dati demo

- 50 articoli Gastronomia
- 50 articoli Forneria
- 10 articoli Rosticceria
- 40 articoli Carni
- 10 articoli Pesce

Totale: 160 articoli.

## Funzioni

- proposte quantità differenziate per tipo giornata;
- festività e prefestivi;
- promozioni evidenziate;
- controllo rapido delle scorte: zero, bassa, ok, alta;
- vista solo eccezioni;
- modalità “Copia nel gestionale” un articolo alla volta;
- salvataggio automatico nel browser tramite localStorage;
- funzionamento offline dopo il caricamento.

## Avvio

Aprire `index.html` direttamente nel browser oppure servire la cartella con un server statico.

Esempio:

```bash
python -m http.server 8000
```

Poi aprire `http://localhost:8000`.
