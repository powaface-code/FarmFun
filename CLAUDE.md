# Farmářský Magnát · Neon Harvest Edition

## Projekt
Jednoduchá webová idle/incremental hra v češtině. Celá hra je v jednom souboru `index.html` (68 KB).
Hostovaná na GitHub Pages: https://powaface-code.github.io/FarmFun/
GitHub repozitář: https://github.com/powaface-code/FarmFun

## Jak pushovat změny na GitHub
```bash
git add index.html
git commit -m "popis změny"
git push
```

## Tech stack
- Čistý HTML + CSS + Vanilla JS (žádné frameworky ani knihovny)
- LocalStorage pro ukládání hry (klíč: `farmtycoon_v3`)
- PWA-ready (manifest, mobilní viewport, podpora notche)
- Mobile-first design (max-width 480px)

## Vizuální styl
- Cyberpunk / Neon Harvest téma
- Pozadí: černá (#000000)
- Primární akcent: neonová smaragdová (#00ffb3)
- Sekundární akcent: zlatá (#ffe566)
- Prestige barva: fialová (#d8bafe)
- Fonty: Sora (UI), DM Serif Display (čísla)
- Efekty: glassmorphism, neon glow, animované toasty

## Herní mechaniky
- **Klikání** na farmy → příjem peněz
- **Manažeři** → automatický pasivní příjem (jeden na každou farmu)
- **Upgrady** → multiplikátory příjmu (×2, ×3, ×5 na každou farmu)
- **Milníky** → bonusy za počet farem (×2, ×3, ×5, ×10...)
- **Buy mody**: ×1, Milestone (do dalšího milníku), Max (za vše co mám)
- **Prestige systém** ("Semínka moudrosti") → reset za permanentní +10% na vše
- **Offline výdělky** → max 8 hodin

## 10 typů farem (v pořadí)
1. 🍓 Jahodová zahrádka (start)
2. 🥕 Mrkvové pole (odemknutí: 200 Kč)
3. 🍅 Rajčatový skleník (odemknutí: 2 000 Kč)
4. 🫐 Borůvkový háj (odemknutí: 20 000 Kč)
5. 🥦 Brokolicová plantáž (odemknutí: 200 000 Kč)
6. 🍇 Vinohrad hroznů (odemknutí: 2 000 000 Kč)
7. 🍉 Melounová farma (odemknutí: 25 000 000 Kč)
8. 🥑 Avokádový sad (odemknutí: 300 000 000 Kč)
9. 🍍 Ananasová plantáž (odemknutí: 3 000 000 000 Kč)
10. 🌶️ Chilli impérium (odemknutí: konec hry?)

## Struktura kódu v index.html
Soubor je organizovaný do sekcí (označených ═══):
- DATA → definice farem, manažerů, upgradů
- STATE → herní stav (peníze, počty, uložení)
- FORMULAS → výpočty cen, příjmů, multiplikátorů
- ACTIONS → klikání, nákupy, logika
- PROGRESS TIMERS → časovače farem, game loop
- FORMAT → formátování čísel (K, M, B, T...)
- RENDER → vykreslování UI
- LIVE UPDATE → aktualizace v reálném čase (50ms loop)
- PRESTIGE → systém prestiže
- SHEETS & NAV → navigace mezi záložkami
- NOTIFICATIONS → toast zprávy, animace
- SAVE/LOAD → localStorage
- INIT → inicializace hry

## Plánované featury / nápady
*(sem průběžně přidávej co chceš implementovat)*

## Historie změn
- **2025** – Hra vytvořena v Claude.ai chatu
- **2026-02-25** – Projekt nahrán na GitHub Pages, nastavena lokální git integrace
