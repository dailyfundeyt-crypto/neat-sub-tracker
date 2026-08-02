## HyperLite – Abo-Manager

Weißer, minimalistischer Look. Logo oben links, daneben "HyperLite" in Satoshi. Alles auf Deutsch, Beträge in €.

### Seiten

**Anmeldung** (`/`, wenn nicht eingeloggt)
Zentriert: Logo, "HyperLite", ein Satz Untertitel, ein Google-Button. Sonst nichts.

**App** (nach Login) – drei Bereiche, die als volle Screens horizontal von rechts nach links einblenden (Swipe auf dem Handy, Tabs/Pfeile am Desktop):

1. **Daten** – die Abo-Tabelle
2. **Analyse**
3. **Rabatte**

Oben rechts: Profilbild aus dem Google-Konto, Klick öffnet kleines Menü (Name, E-Mail, Abmelden).

### Bereich 1: Daten (Notion-artige Tabelle)

Spalten:
- Logo des Dienstes (klein, rund)
- Name (z. B. Adobe)
- Kategorie
- Preis + Intervall (monatlich / jährlich)
- Nächste Zahlung (Datum) – ist sie in ≤ 3 Tagen, wird das Label in dieser Spalte farbig markiert ("in 3 Tagen")
- Kündigen bis (Datum) – bald anstehende Kündigungen werden ganz oben einsortiert
- Restguthaben (wie viel Geld für Folgemonate noch übrig ist, falls Guthaben hinterlegt)

Darüber eine schmale Leiste "Demnächst": bald fällige Zahlungen und bald ablaufende Kündigungsfristen.

Unten/oben ein runder weißer **Plus-Button mit schwarzem Plus** – öffnet ein schlankes Formular: Logo hochladen, Name, Kategorie, Preis, Intervall, nächste Zahlung, Kündigungsdatum, Guthaben.

**Geteilte Logo-Bibliothek:** Lädt jemand ein Logo mit Bezeichnung hoch (z. B. „Adobe"), wird es einmalig zentral gespeichert. Beim nächsten Tippen von „Adobe" schlägt die App das vorhandene Logo automatisch vor – auch anderen Nutzern. Eigene Abo-Daten (Preise, Daten, Guthaben) bleiben privat.

### Bereich 2: Analyse

- Kreisdiagramm: Ausgaben nach Kategorie
- Balken-/Liniendiagramm: Ausgaben über das Jahr
- Zwei Kennzahlen darüber: Kosten pro Monat, Kosten pro Jahr

### Bereich 3: Rabatte (Community-Deals)

Liste von Rabattcodes/Angeboten zu Diensten, die Nutzer selbst eintragen: Dienst (mit Logo aus der Bibliothek), Titel, Code, gültig bis, Link. Alle Nutzer sehen alle Deals, jeder darf eintragen und die eigenen Einträge löschen.

### Technisches

- Lovable Cloud für Login (nur Google), Datenbank und Logo-Speicher.
- Tabellen: `subscriptions` (privat pro Nutzer, RLS), `service_logos` (öffentlich lesbar, eingeloggte Nutzer dürfen ergänzen), `deals` (öffentlich lesbar, eigene Einträge bearbeitbar). Storage-Bucket für Logos.
- Satoshi wird per Webfont-Link eingebunden; Design-Tokens in `src/styles.css` (Weiß/Schwarz, ein Akzent für Fälligkeits-Warnungen).
- Recharts für die Diagramme, Swipe-Panels ohne schwere Abhängigkeit.
- Das hochgeladene HyperCore-Logo wird als App-Logo und Favicon gesetzt.
- Mobile-first, Tabelle wird auf dem Handy zu kompakten Karten-Zeilen.
